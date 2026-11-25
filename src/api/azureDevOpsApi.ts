import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  getClient,
  type IProjectPageService,
} from "azure-devops-extension-api";
import {
  BuildRestClient,
  BuildQueryOrder,
  BuildResult,
  BuildStatus,
  TimelineRecordState,
  TaskResult,
  type Build,
  type BuildDefinitionReference,
  type TimelineRecord,
} from "azure-devops-extension-api/Build";
import { findPendingApprovalId } from "../utils/findPendingApproval";
import { loadRelevantRuns } from "../utils/loadRelevantRuns";
import { mapWithLimit } from "../utils/mapWithLimit";
import type {
  DashboardApi,
  Pipeline,
  PipelineRun,
  StageRun,
  StageState,
} from "../types";

const RUNS_PER_PIPELINE = 20;
const MAX_PARALLEL_REQUESTS = 6;

function stageStateFromRecord(record: TimelineRecord): StageState {
  if (record.state === TimelineRecordState.InProgress) {
    return "running";
  }
  if (record.state === TimelineRecordState.Pending) {
    return "pending";
  }
  switch (record.result) {
    case TaskResult.Succeeded:
      return "succeeded";
    case TaskResult.SucceededWithIssues:
      return "partial";
    case TaskResult.Failed:
      return "failed";
    case TaskResult.Canceled:
    case TaskResult.Abandoned:
      return "canceled";
    case TaskResult.Skipped:
      return "skipped";
    default:
      return "pending";
  }
}

function overallStateFromBuild(build: Build): StageState {
  if (build.status === BuildStatus.NotStarted) {
    return "pending";
  }
  if (build.status !== BuildStatus.Completed) {
    return "running";
  }
  switch (build.result) {
    case BuildResult.Succeeded:
      return "succeeded";
    case BuildResult.PartiallySucceeded:
      return "partial";
    case BuildResult.Failed:
      return "failed";
    case BuildResult.Canceled:
      return "canceled";
    default:
      return "pending";
  }
}

function stagesFromTimeline(
  timelineRecords: TimelineRecord[],
  buildIsFinished: boolean,
): StageRun[] {
  const stageRecords = timelineRecords.filter((record) => record.type === "Stage");
  stageRecords.sort((first, second) => first.order - second.order);
  const approvalCandidates = timelineRecords.map((record) => ({
    id: record.id,
    parentId: record.parentId,
    type: record.type,
    isInProgress: record.state === TimelineRecordState.InProgress,
  }));
  return stageRecords.map((record) => {
    const recordState = stageStateFromRecord(record);
    // A stage still pending in a finished build was never run.
    const neverRan = buildIsFinished && recordState === "pending";
    const state: StageState = neverRan ? "skipped" : recordState;
    return {
      name: record.name,
      state,
      pendingApprovalId: findPendingApprovalId(approvalCandidates, record.id),
      startTime: record.startTime?.toISOString(),
      finishTime: record.finishTime?.toISOString(),
    };
  });
}

export class AzureDevOpsApi implements DashboardApi {
  async loadPipelines(): Promise<Pipeline[]> {
    const projectService = await SDK.getService<IProjectPageService>(
      CommonServiceIds.ProjectPageService,
    );
    const project = await projectService.getProject();
    if (!project) {
      throw new Error("Could not determine the current project.");
    }

    const buildClient = getClient(BuildRestClient);
    const definitions = await buildClient.getDefinitions(project.name);
    const organizationName = SDK.getHost().name;
    const baseUrl = `https://dev.azure.com/${organizationName}/${encodeURIComponent(project.name)}`;

    return mapWithLimit(definitions, MAX_PARALLEL_REQUESTS, (definition) => {
      return this.loadPipeline(buildClient, project.name, baseUrl, definition);
    });
  }

  private async loadPipeline(
    buildClient: BuildRestClient,
    projectName: string,
    baseUrl: string,
    definition: BuildDefinitionReference,
  ): Promise<Pipeline> {
    const builds = await buildClient.getBuilds(
      projectName,
      [definition.id],
      undefined, // queues
      undefined, // buildNumber
      undefined, // minTime
      undefined, // maxTime
      undefined, // requestedFor
      undefined, // reasonFilter
      undefined, // statusFilter
      undefined, // resultFilter
      undefined, // tagFilters
      undefined, // properties
      RUNS_PER_PIPELINE, // top
      undefined, // continuationToken
      undefined, // maxBuildsPerDefinition
      undefined, // deletedFilter
      BuildQueryOrder.QueueTimeDescending, // in-progress builds have no finish time
    );

    const runs = await loadRelevantRuns(
      builds,
      (build) => build.status === BuildStatus.Completed,
      async (build) => {
        const timeline = await buildClient.getBuildTimeline(projectName, build.id);
        const timelineRecords = timeline?.records ?? [];
        return this.toPipelineRun(build, timelineRecords, baseUrl);
      },
    );

    return {
      id: definition.id,
      name: definition.name,
      projectName,
      webUrl: `${baseUrl}/_build?definitionId=${definition.id}`,
      runs,
    };
  }

  private toPipelineRun(
    build: Build,
    timelineRecords: TimelineRecord[],
    baseUrl: string,
  ): PipelineRun {
    return {
      id: build.id,
      buildNumber: build.buildNumber,
      sourceBranch: build.sourceBranch,
      commitHash: (build.sourceVersion ?? "").slice(0, 7),
      requestedBy: build.requestedFor?.displayName ?? "",
      queueTime: build.queueTime?.toISOString(),
      startTime: build.startTime?.toISOString(),
      finishTime: build.finishTime?.toISOString(),
      agentPool: build.queue?.pool?.name,
      overallState: overallStateFromBuild(build),
      stages: stagesFromTimeline(timelineRecords, build.status === BuildStatus.Completed),
      webUrl: `${baseUrl}/_build/results?buildId=${build.id}`,
    };
  }
}

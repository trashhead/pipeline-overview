import type {
  DashboardApi,
  Pipeline,
  PipelineRun,
  StageRun,
  StageState,
} from "../types";
import { findPendingApprovalId } from "../utils/findPendingApproval";
import { loadRelevantRuns } from "../utils/loadRelevantRuns";
import { mapWithLimit } from "../utils/mapWithLimit";

/**
 * Live data for local development. Talks to the Vite dev server at /ado, which forwards the
 * calls to https://dev.azure.com and adds the personal access token (see vite.config.ts).
 * The token never reaches the browser.
 */

const RUNS_PER_PIPELINE = 20;
const MAX_PARALLEL_REQUESTS = 6;
const API_VERSION = "7.1";

interface RestDefinition {
  id: number;
  name: string;
}

interface RestBuild {
  id: number;
  buildNumber: string;
  sourceBranch: string;
  sourceVersion?: string;
  requestedFor?: { displayName: string };
  queueTime?: string;
  startTime?: string;
  finishTime?: string;
  status: string;
  result?: string;
  queue?: { pool?: { name: string } };
}

interface RestTimelineRecord {
  type: string;
  name: string;
  id: string;
  parentId?: string;
  order: number;
  state?: string;
  result?: string;
  startTime?: string;
  finishTime?: string;
}

interface RestList<Item> {
  value: Item[];
}

function stageStateFromRecord(record: RestTimelineRecord): StageState {
  if (record.state === "inProgress") {
    return "running";
  }
  if (record.state === "pending") {
    return "pending";
  }
  switch (record.result) {
    case "succeeded":
      return "succeeded";
    case "succeededWithIssues":
      return "partial";
    case "failed":
      return "failed";
    case "canceled":
    case "abandoned":
      return "canceled";
    case "skipped":
      return "skipped";
    default:
      return "pending";
  }
}

function overallStateFromBuild(build: RestBuild): StageState {
  if (build.status === "notStarted") {
    return "pending";
  }
  if (build.status !== "completed") {
    return "running";
  }
  switch (build.result) {
    case "succeeded":
      return "succeeded";
    case "partiallySucceeded":
      return "partial";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    default:
      return "pending";
  }
}

function stagesFromTimeline(
  records: RestTimelineRecord[],
  buildIsFinished: boolean,
): StageRun[] {
  const stageRecords = records.filter((record) => record.type === "Stage");
  stageRecords.sort((first, second) => first.order - second.order);
  const approvalCandidates = records.map((record) => ({
    id: record.id,
    parentId: record.parentId,
    type: record.type,
    isInProgress: record.state === "inProgress",
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
      startTime: record.startTime,
      finishTime: record.finishTime,
    };
  });
}

export class DevProxyApi implements DashboardApi {
  private readonly projectUrl: string;
  private readonly browserBaseUrl: string;

  constructor(
    private readonly organizationName: string,
    private readonly projectName: string,
  ) {
    const encodedProject = encodeURIComponent(projectName);
    this.projectUrl = `/ado/${organizationName}/${encodedProject}`;
    this.browserBaseUrl = `https://dev.azure.com/${organizationName}/${encodedProject}`;
  }

  async loadPipelines(): Promise<Pipeline[]> {
    const definitionList = await this.get<RestList<RestDefinition>>("/_apis/build/definitions");
    return mapWithLimit(definitionList.value, MAX_PARALLEL_REQUESTS, (definition) => {
      return this.loadPipeline(definition);
    });
  }

  private async loadPipeline(definition: RestDefinition): Promise<Pipeline> {
    const buildList = await this.get<RestList<RestBuild>>(
      `/_apis/build/builds?definitions=${definition.id}` +
        `&queryOrder=queueTimeDescending&$top=${RUNS_PER_PIPELINE}`,
    );

    const runs = await loadRelevantRuns(
      buildList.value,
      (build) => build.status === "completed",
      async (build) => {
        const timeline = await this.get<{ records?: RestTimelineRecord[] }>(
          `/_apis/build/builds/${build.id}/timeline`,
        );
        return this.toPipelineRun(build, timeline.records ?? []);
      },
    );

    return {
      id: definition.id,
      name: definition.name,
      projectName: this.projectName,
      webUrl: `${this.browserBaseUrl}/_build?definitionId=${definition.id}`,
      runs,
    };
  }

  private toPipelineRun(build: RestBuild, records: RestTimelineRecord[]): PipelineRun {
    return {
      id: build.id,
      buildNumber: build.buildNumber,
      sourceBranch: build.sourceBranch,
      commitHash: (build.sourceVersion ?? "").slice(0, 7),
      requestedBy: build.requestedFor?.displayName ?? "",
      queueTime: build.queueTime,
      startTime: build.startTime,
      finishTime: build.finishTime,
      agentPool: build.queue?.pool?.name,
      overallState: overallStateFromBuild(build),
      stages: stagesFromTimeline(records, build.status === "completed"),
      webUrl: `${this.browserBaseUrl}/_build/results?buildId=${build.id}`,
    };
  }

  private async get<Result>(path: string): Promise<Result> {
    const separator = path.includes("?") ? "&" : "?";
    const url = `${this.projectUrl}${path}${separator}api-version=${API_VERSION}`;
    const response = await fetch(url);
    const hasNoContent = response.status === 204;
    if (hasNoContent) {
      // Builds without a timeline (expired or never started) answer 204 with an empty body.
      return {} as Result;
    }
    if (!response.ok) {
      throw new Error(`Azure DevOps returned ${response.status} for ${path}`);
    }
    return (await response.json()) as Result;
  }
}

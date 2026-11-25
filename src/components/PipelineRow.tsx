import type { LatestDeployment, Pipeline, PipelineRun } from "../types";
import {
  findLatestDeployments,
  formatDuration,
  formatRelativeDate,
  shortRefName,
} from "../utils/format";
import { useDashboardStore } from "../store/dashboardStore";
import { StatusPill } from "./StatusPill";

function LatestDeploymentBadge({ deployment }: { deployment: LatestDeployment }) {
  return (
    <div className="deployment-badge">
      <div className="deployment-badge-title">{deployment.stageName}</div>
      <div className="deployment-badge-build">✔ {deployment.buildNumber}</div>
      <div className="deployment-badge-meta">
        {formatDuration(deployment.durationMilliseconds)}{" "}
        {formatRelativeDate(deployment.finishTime)}
      </div>
    </div>
  );
}

function RunEntry({ run }: { run: PipelineRun }) {
  return (
    <div className="run-entry">
      <div className="run-entry-header">
        <a href={run.webUrl} target="_top" className="run-build-number">
          {run.buildNumber}
        </a>
        <span className="run-ref">{shortRefName(run.sourceBranch)}</span>
        <span className="run-commit">{run.commitHash}</span>
        <span className="run-author">{run.requestedBy}</span>
        <span className="run-date">{formatRelativeDate(run.queueTime)}</span>
      </div>
      <div className="run-stages">
        {run.stages.map((stage) => (
          <StatusPill
            key={stage.name}
            label={stage.name}
            state={stage.state}
            awaitingApproval={stage.pendingApprovalId !== undefined}
            approvalUrl={run.webUrl}
          />
        ))}
      </div>
    </div>
  );
}

interface PipelineRowProps {
  pipeline: Pipeline;
}

export function PipelineRow({ pipeline }: PipelineRowProps) {
  const latestDeployments = findLatestDeployments(pipeline);
  const newestRun = pipeline.runs[0];
  const runningCount = pipeline.runs.filter((run) => run.overallState === "running").length;
  const runsToShow = useDashboardStore((state) => state.runsToShow);
  const visibleRuns = pipeline.runs.slice(0, runsToShow);

  return (
    <section className="pipeline-row">
      <div className="pipeline-name-column">
        <a href={pipeline.webUrl} target="_top" className="pipeline-name">
          {pipeline.name}
        </a>
        <div className="pipeline-project">
          {pipeline.projectName}
          {runningCount > 0 ? ` - ${runningCount} in progress` : ""}
        </div>
      </div>

      <div className="pipeline-runs-column">
        <div className="deployment-badges">
          {latestDeployments.map((deployment) => (
            <LatestDeploymentBadge key={deployment.stageName} deployment={deployment} />
          ))}
        </div>
        {visibleRuns.map((run) => (
          <RunEntry key={run.id} run={run} />
        ))}
      </div>

      <div className="pipeline-info-column">
        {newestRun && (
          <>
            <div>{newestRun.requestedBy}</div>
            <div>{newestRun.agentPool}</div>
            <div>
              {formatRelativeDate(newestRun.queueTime)}{" "}
              {formatDuration(
                newestRun.finishTime && newestRun.startTime
                  ? new Date(newestRun.finishTime).getTime() -
                      new Date(newestRun.startTime).getTime()
                  : undefined,
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

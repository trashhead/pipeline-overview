import type { LatestDeployment, Pipeline, StageState } from "../types";

export function formatDuration(durationMilliseconds?: number): string {
  if (durationMilliseconds === undefined) {
    return "";
  }
  const totalSeconds = Math.round(durationMilliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export function formatRelativeDate(isoDate?: string): string {
  if (!isoDate) {
    return "";
  }
  const date = new Date(isoDate);
  const now = new Date();
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const daysAgo = Math.floor((now.getTime() - date.getTime()) / millisecondsPerDay);
  if (daysAgo < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function shortRefName(sourceBranch: string): string {
  return sourceBranch.replace(/^refs\/heads\//, "");
}

export function durationOf(startTime?: string, finishTime?: string): number | undefined {
  if (!startTime || !finishTime) {
    return undefined;
  }
  return new Date(finishTime).getTime() - new Date(startTime).getTime();
}

/** Finds, per stage name, the newest run in which that stage succeeded. */
export function findLatestDeployments(pipeline: Pipeline): LatestDeployment[] {
  const latestByStageName = new Map<string, LatestDeployment>();

  const newestFirst = [...pipeline.runs].sort((first, second) => second.id - first.id);
  for (const run of newestFirst) {
    for (const stage of run.stages) {
      const alreadyFound = latestByStageName.has(stage.name);
      if (alreadyFound || stage.state !== "succeeded") {
        continue;
      }
      latestByStageName.set(stage.name, {
        stageName: stage.name,
        buildNumber: run.buildNumber,
        durationMilliseconds: durationOf(stage.startTime, stage.finishTime),
        finishTime: stage.finishTime,
      });
    }
  }
  return [...latestByStageName.values()];
}

export function countRunsByState(pipelines: Pipeline[]): Record<StageState, number> {
  const counts: Record<StageState, number> = {
    succeeded: 0,
    failed: 0,
    running: 0,
    pending: 0,
    skipped: 0,
    canceled: 0,
    partial: 0,
  };
  for (const pipeline of pipelines) {
    for (const run of pipeline.runs) {
      counts[run.overallState] += 1;
    }
  }
  return counts;
}

/** Sort rank for "Cancelled/Failed/Partial on top". Lower comes first. */
export function attentionRank(pipeline: Pipeline): number {
  const states = pipeline.runs.map((run) => run.overallState);
  if (states.includes("failed")) {
    return 0;
  }
  if (states.includes("partial")) {
    return 1;
  }
  if (states.includes("canceled")) {
    return 2;
  }
  return 3;
}

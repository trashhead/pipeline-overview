import type { PipelineRun } from "../types";
import { mapWithLimit } from "./mapWithLimit";

const MAX_PARALLEL_REQUESTS = 6;

function namesOfSucceededStages(run: PipelineRun): string[] {
  return run.stages.filter((stage) => stage.state === "succeeded").map((stage) => stage.name);
}

/**
 * Loads stage data (one timeline request per run) only for the runs the dashboard needs:
 * - every unfinished run, and
 * - finished runs, newest first, until each stage has been seen succeeding at least once
 *   (that is what the "latest deployment" badges are built from).
 *
 * `builds` must be sorted newest first.
 */
export async function loadRelevantRuns<Build>(
  builds: Build[],
  isFinished: (build: Build) => boolean,
  loadRun: (build: Build) => Promise<PipelineRun>,
): Promise<PipelineRun[]> {
  const unfinishedBuilds = builds.filter((build) => !isFinished(build));
  const finishedBuilds = builds.filter((build) => isFinished(build));

  const runs = await mapWithLimit(unfinishedBuilds, MAX_PARALLEL_REQUESTS, loadRun);

  const knownStageNames = new Set<string>();
  const succeededStageNames = new Set<string>();

  function takeNoteOf(run: PipelineRun) {
    run.stages.forEach((stage) => knownStageNames.add(stage.name));
    namesOfSucceededStages(run).forEach((name) => succeededStageNames.add(name));
  }

  function everyStageHasSucceeded(): boolean {
    if (knownStageNames.size === 0) {
      return false;
    }
    return [...knownStageNames].every((name) => succeededStageNames.has(name));
  }

  runs.forEach(takeNoteOf);

  for (const build of finishedBuilds) {
    if (everyStageHasSucceeded()) {
      break;
    }
    const run = await loadRun(build);
    takeNoteOf(run);
    runs.push(run);
  }

  return runs.sort((first, second) => second.id - first.id);
}

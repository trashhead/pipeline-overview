import type { DashboardApi, Pipeline, PipelineRun, StageRun, StageState } from "../types";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function isoDaysAgo(daysAgo: number, extraMilliseconds = 0): string {
  return new Date(Date.now() - daysAgo * DAY + extraMilliseconds).toISOString();
}

function buildStage(
  name: string,
  state: StageState,
  daysAgo: number,
  pendingApprovalId?: string,
): StageRun {
  const startTime = isoDaysAgo(daysAgo);
  const finishTime = isoDaysAgo(daysAgo, 3 * MINUTE);
  return { name, state, startTime, finishTime, pendingApprovalId };
}

function buildRun(
  id: number,
  tag: string,
  daysAgo: number,
  overallState: StageState,
  stageStates: [StageState, StageState, StageState],
): PipelineRun {
  const [buildState, testState, prodState] = stageStates;
  return {
    id,
    buildNumber: `${tag}-1`,
    sourceBranch: `refs/tags/${tag}`,
    commitHash: id.toString(16).padStart(7, "0"),
    requestedBy: "Doe, Jane",
    queueTime: isoDaysAgo(daysAgo),
    startTime: isoDaysAgo(daysAgo),
    finishTime: isoDaysAgo(daysAgo, 5 * MINUTE),
    agentPool: "Hosted Ubuntu 1604",
    overallState,
    stages: [
      buildStage("Build", buildState, daysAgo),
      buildStage("Test", testState, daysAgo),
      buildStage("Prod", prodState, daysAgo, prodState === "running" ? `approval-${id}` : undefined),
    ],
    webUrl: "#",
  };
}

const mockPipelines: Pipeline[] = [
  {
    id: 1,
    name: "web-app",
    projectName: "Example Project",
    webUrl: "#",
    runs: [
      buildRun(105, "0.0.8", 5, "running", ["succeeded", "succeeded", "running"]),
      buildRun(104, "0.0.6", 6, "running", ["succeeded", "succeeded", "running"]),
      buildRun(103, "0.0.5", 6, "succeeded", ["succeeded", "succeeded", "succeeded"]),
      buildRun(102, "0.0.4", 8, "succeeded", ["succeeded", "succeeded", "succeeded"]),
      buildRun(101, "0.0.3", 8, "succeeded", ["succeeded", "succeeded", "succeeded"]),
    ],
  },
  {
    id: 2,
    name: "web-site",
    projectName: "Example Project",
    webUrl: "#",
    runs: [
      buildRun(212, "0.0.7", 6, "running", ["succeeded", "succeeded", "running"]),
      buildRun(211, "0.0.6", 8, "partial", ["succeeded", "succeeded", "partial"]),
      buildRun(210, "0.0.5", 8, "succeeded", ["succeeded", "succeeded", "succeeded"]),
    ],
  },
  {
    id: 3,
    name: "orders-api",
    projectName: "Example Project",
    webUrl: "#",
    runs: [
      buildRun(310, "1.4.2", 1, "failed", ["succeeded", "failed", "skipped"]),
      buildRun(309, "1.4.1", 3, "succeeded", ["succeeded", "succeeded", "succeeded"]),
    ],
  },
];

export class MockApi implements DashboardApi {
  async loadPipelines(): Promise<Pipeline[]> {
    const simulatedNetworkDelay = 400;
    await new Promise((resolve) => setTimeout(resolve, simulatedNetworkDelay));
    return mockPipelines;
  }
}

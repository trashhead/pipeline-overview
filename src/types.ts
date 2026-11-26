export type StageState =
  | "succeeded"
  | "failed"
  | "running"
  | "pending"
  | "skipped"
  | "canceled"
  | "partial";

export interface StageRun {
  name: string;
  state: StageState;
  startTime?: string;
  finishTime?: string;
  /** Set when the stage is waiting for someone to approve it. */
  pendingApprovalId?: string;
}

export interface PipelineRun {
  id: number;
  buildNumber: string;
  sourceBranch: string;
  commitHash: string;
  requestedBy: string;
  queueTime?: string;
  startTime?: string;
  finishTime?: string;
  agentPool?: string;
  overallState: StageState;
  stages: StageRun[];
  webUrl: string;
}

export interface Pipeline {
  id: number;
  name: string;
  projectName: string;
  webUrl: string;
  runs: PipelineRun[];
}

/** The newest successful run of one stage, shown as a green pill at the top of a pipeline row. */
export interface LatestDeployment {
  stageName: string;
  buildNumber: string;
  durationMilliseconds?: number;
  finishTime?: string;
}

export interface DashboardApi {
  loadPipelines(): Promise<Pipeline[]>;
}

export type StatusOrder = "attention-first" | "name";

/** The choices in the filter bar that are remembered between visits. */
export interface DashboardSettings {
  statusOrder: StatusOrder;
  runsToShow: number;
  refreshIntervalSeconds: number;
}

export interface SettingsStorage {
  /** The saved value is returned unchecked, see pickValidSettings. */
  load(): Promise<unknown>;
  save(settings: DashboardSettings): Promise<void>;
}

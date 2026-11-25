import { create } from "zustand";
import type { DashboardApi, Pipeline } from "../types";

export type StatusOrder = "attention-first" | "name";

interface DashboardState {
  pipelines: Pipeline[];
  isLoading: boolean;
  errorMessage?: string;
  keywordFilter: string;
  statusOrder: StatusOrder;
  runsToShow: number;
  refreshIntervalSeconds: number;
  lastUpdated?: Date;
  load: (api: DashboardApi) => Promise<void>;
  setKeywordFilter: (keyword: string) => void;
  setStatusOrder: (statusOrder: StatusOrder) => void;
  setRunsToShow: (runsToShow: number) => void;
  setRefreshIntervalSeconds: (seconds: number) => void;
}

export const RUNS_TO_SHOW_OPTIONS = [3, 5, 10, 20];

/** 0 means automatic refresh is off. */
export const REFRESH_INTERVAL_OPTIONS = [
  { seconds: 0, label: "Off" },
  { seconds: 30, label: "30 s" },
  { seconds: 60, label: "1 min" },
  { seconds: 300, label: "5 min" },
];

export const useDashboardStore = create<DashboardState>((set, get) => ({
  pipelines: [],
  isLoading: false,
  errorMessage: undefined,
  keywordFilter: "",
  statusOrder: "attention-first",
  runsToShow: 5,
  refreshIntervalSeconds: 60,
  lastUpdated: undefined,

  load: async (api) => {
    const alreadyLoading = get().isLoading;
    if (alreadyLoading) {
      return;
    }
    // Old data stays on screen while reloading, so polling does not make the list flicker.
    set({ isLoading: true });
    try {
      const pipelines = await api.loadPipelines();
      set({
        pipelines,
        isLoading: false,
        errorMessage: undefined,
        lastUpdated: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ errorMessage: message, isLoading: false });
    }
  },

  setKeywordFilter: (keyword) => set({ keywordFilter: keyword }),
  setStatusOrder: (statusOrder) => set({ statusOrder }),
  setRunsToShow: (runsToShow) => set({ runsToShow }),
  setRefreshIntervalSeconds: (seconds) => set({ refreshIntervalSeconds: seconds }),
}));

import { create } from "zustand";
import { pickValidSettings } from "../settings/pickValidSettings";
import type {
  DashboardApi,
  DashboardSettings,
  Pipeline,
  SettingsStorage,
  StatusOrder,
} from "../types";

interface DashboardState extends DashboardSettings {
  pipelines: Pipeline[];
  isLoading: boolean;
  errorMessage?: string;
  keywordFilter: string;
  lastUpdated?: Date;
  settingsStorage?: SettingsStorage;
  load: (api: DashboardApi) => Promise<void>;
  /** Applies the saved settings and remembers where to save later changes. */
  restoreSettings: (settingsStorage: SettingsStorage) => Promise<void>;
  setKeywordFilter: (keyword: string) => void;
  setStatusOrder: (statusOrder: StatusOrder) => void;
  setRunsToShow: (runsToShow: number) => void;
  setRefreshIntervalSeconds: (seconds: number) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => {
  async function changeSettings(changedSettings: Partial<DashboardSettings>) {
    set(changedSettings);
    const { settingsStorage, statusOrder, runsToShow, refreshIntervalSeconds } = get();
    try {
      await settingsStorage?.save({ statusOrder, runsToShow, refreshIntervalSeconds });
    } catch (error) {
      // Not worth interrupting the user for: the choice still applies until the page is closed.
      console.warn("Could not save the dashboard settings", error);
    }
  }

  return {
    pipelines: [],
    isLoading: false,
    errorMessage: undefined,
    keywordFilter: "",
    statusOrder: "attention-first",
    runsToShow: 5,
    refreshIntervalSeconds: 60,
    lastUpdated: undefined,
    settingsStorage: undefined,

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

    restoreSettings: async (settingsStorage) => {
      set({ settingsStorage });
      try {
        const savedValue = await settingsStorage.load();
        set(pickValidSettings(savedValue));
      } catch (error) {
        console.warn("Could not load the dashboard settings", error);
      }
    },

    setKeywordFilter: (keyword) => set({ keywordFilter: keyword }),
    setStatusOrder: (statusOrder) => {
      changeSettings({ statusOrder });
    },
    setRunsToShow: (runsToShow) => {
      changeSettings({ runsToShow });
    },
    setRefreshIntervalSeconds: (seconds) => {
      changeSettings({ refreshIntervalSeconds: seconds });
    },
  };
});

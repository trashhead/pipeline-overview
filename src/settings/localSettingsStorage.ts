import type { DashboardSettings, SettingsStorage } from "../types";

const STORAGE_KEY = "cicd-overview-settings";

/** Used outside Azure DevOps (dev server and mock mode). Settings stay in this browser. */
export class LocalSettingsStorage implements SettingsStorage {
  async load(): Promise<unknown> {
    const savedText = window.localStorage.getItem(STORAGE_KEY);
    if (!savedText) {
      return undefined;
    }
    return JSON.parse(savedText);
  }

  async save(settings: DashboardSettings): Promise<void> {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
}

import type { DashboardSettings } from "../types";
import {
  REFRESH_INTERVAL_OPTIONS,
  RUNS_TO_SHOW_OPTIONS,
  STATUS_ORDERS,
} from "./settingsOptions";

/**
 * Saved settings can be missing, or come from an older version with other options.
 * Only values that are still valid choices are returned.
 */
export function pickValidSettings(savedValue: unknown): Partial<DashboardSettings> {
  const validSettings: Partial<DashboardSettings> = {};
  if (typeof savedValue !== "object" || savedValue === null) {
    return validSettings;
  }
  const saved = savedValue as Partial<DashboardSettings>;

  const statusOrder = STATUS_ORDERS.find((option) => option === saved.statusOrder);
  if (statusOrder !== undefined) {
    validSettings.statusOrder = statusOrder;
  }

  const runsToShow = RUNS_TO_SHOW_OPTIONS.find((option) => option === saved.runsToShow);
  if (runsToShow !== undefined) {
    validSettings.runsToShow = runsToShow;
  }

  const refreshInterval = REFRESH_INTERVAL_OPTIONS.find(
    (option) => option.seconds === saved.refreshIntervalSeconds,
  );
  if (refreshInterval !== undefined) {
    validSettings.refreshIntervalSeconds = refreshInterval.seconds;
  }

  return validSettings;
}

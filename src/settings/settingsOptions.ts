import type { StatusOrder } from "../types";

export const STATUS_ORDERS: StatusOrder[] = ["attention-first", "name"];

export const RUNS_TO_SHOW_OPTIONS = [3, 5, 10, 20];

/** 0 means automatic refresh is off. */
export const REFRESH_INTERVAL_OPTIONS = [
  { seconds: 0, label: "Off" },
  { seconds: 30, label: "30 s" },
  { seconds: 60, label: "1 min" },
  { seconds: 300, label: "5 min" },
];

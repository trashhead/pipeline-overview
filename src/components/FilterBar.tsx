import type { DashboardApi } from "../types";
import {
  REFRESH_INTERVAL_OPTIONS,
  RUNS_TO_SHOW_OPTIONS,
  useDashboardStore,
  type StatusOrder,
} from "../store/dashboardStore";

interface FilterBarProps {
  api: DashboardApi;
}

export function FilterBar({ api }: FilterBarProps) {
  const keywordFilter = useDashboardStore((state) => state.keywordFilter);
  const statusOrder = useDashboardStore((state) => state.statusOrder);
  const setKeywordFilter = useDashboardStore((state) => state.setKeywordFilter);
  const setStatusOrder = useDashboardStore((state) => state.setStatusOrder);
  const runsToShow = useDashboardStore((state) => state.runsToShow);
  const setRunsToShow = useDashboardStore((state) => state.setRunsToShow);
  const refreshIntervalSeconds = useDashboardStore((state) => state.refreshIntervalSeconds);
  const setRefreshIntervalSeconds = useDashboardStore(
    (state) => state.setRefreshIntervalSeconds,
  );
  const isLoading = useDashboardStore((state) => state.isLoading);
  const lastUpdated = useDashboardStore((state) => state.lastUpdated);
  const load = useDashboardStore((state) => state.load);

  return (
    <div className="filter-bar">
      <input
        className="filter-input"
        type="search"
        placeholder="Filter by keywords"
        value={keywordFilter}
        onChange={(event) => setKeywordFilter(event.target.value)}
      />
      <span className="last-updated">
        {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : isLoading && "Loading…"}
      </span>
      <button
        type="button"
        className="refresh-button"
        disabled={isLoading}
        title="Refresh now"
        onClick={() => load(api)}
      >
        <svg
          className={isLoading ? "refresh-icon spinning" : "refresh-icon"}
          viewBox="0 0 24 24"
          width="14"
          height="14"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
          />
        </svg>
        Refresh
      </button>
      <label className="filter-select">
        Auto:
        <select
          value={refreshIntervalSeconds}
          onChange={(event) => setRefreshIntervalSeconds(Number(event.target.value))}
        >
          {REFRESH_INTERVAL_OPTIONS.map((option) => (
            <option key={option.seconds} value={option.seconds}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-select">
        Runs shown:
        <select
          value={runsToShow}
          onChange={(event) => setRunsToShow(Number(event.target.value))}
        >
          {RUNS_TO_SHOW_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-select">
        Status order:
        <select
          value={statusOrder}
          onChange={(event) => setStatusOrder(event.target.value as StatusOrder)}
        >
          <option value="attention-first">Cancelled/Failed/Partial on top</option>
          <option value="name">Name</option>
        </select>
      </label>
    </div>
  );
}

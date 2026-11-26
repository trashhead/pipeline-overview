import { useEffect, useMemo } from "react";
import type { DashboardApi } from "./types";
import { useDashboardStore } from "./store/dashboardStore";
import { attentionRank } from "./utils/format";
import { FilterBar } from "./components/FilterBar";
import { PipelineRow } from "./components/PipelineRow";
import { SummaryCounts } from "./components/SummaryCounts";

const FEEDBACK_URL = "https://github.com/trashhead/pipeline-overview/issues";

interface AppProps {
  api: DashboardApi;
}

export function App({ api }: AppProps) {
  const pipelines = useDashboardStore((state) => state.pipelines);
  const isLoading = useDashboardStore((state) => state.isLoading);
  const errorMessage = useDashboardStore((state) => state.errorMessage);
  const keywordFilter = useDashboardStore((state) => state.keywordFilter);
  const statusOrder = useDashboardStore((state) => state.statusOrder);
  const load = useDashboardStore((state) => state.load);
  const refreshIntervalSeconds = useDashboardStore((state) => state.refreshIntervalSeconds);

  useEffect(() => {
    load(api);
  }, [api, load]);

  useEffect(() => {
    if (refreshIntervalSeconds === 0) {
      return;
    }

    function refreshIfTabIsVisible() {
      if (document.visibilityState === "visible") {
        load(api);
      }
    }

    const timerId = setInterval(refreshIfTabIsVisible, refreshIntervalSeconds * 1000);
    document.addEventListener("visibilitychange", refreshIfTabIsVisible);
    return () => {
      clearInterval(timerId);
      document.removeEventListener("visibilitychange", refreshIfTabIsVisible);
    };
  }, [api, load, refreshIntervalSeconds]);

  const visiblePipelines = useMemo(() => {
    const keyword = keywordFilter.trim().toLowerCase();
    const filtered = pipelines.filter((pipeline) => {
      return pipeline.name.toLowerCase().includes(keyword);
    });

    return filtered.sort((first, second) => {
      if (statusOrder === "attention-first") {
        const rankDifference = attentionRank(first) - attentionRank(second);
        if (rankDifference !== 0) {
          return rankDifference;
        }
      }
      return first.name.localeCompare(second.name);
    });
  }, [pipelines, keywordFilter, statusOrder]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>CI/CD Overview</h1>
          <div className="app-version">
            v{__APP_VERSION__} · built {__BUILD_TIME__}
          </div>
        </div>
        <SummaryCounts pipelines={pipelines} />
      </header>

      <FilterBar api={api} />

      {errorMessage && <div className="error-banner">{errorMessage}</div>}
      {isLoading && pipelines.length === 0 && (
        <div className="loading">Loading pipelines…</div>
      )}

      <h2 className="section-title">All pipelines</h2>
      {visiblePipelines.map((pipeline) => (
        <PipelineRow key={pipeline.id} pipeline={pipeline} />
      ))}

      <footer className="dashboard-footer">
        CI/CD Overview is an Azure DevOps extension.{" "}
        <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
          Report a problem or suggest an improvement
        </a>
      </footer>
    </div>
  );
}

import type { Pipeline, StageState } from "../types";
import { countRunsByState } from "../utils/format";
import { STATE_ICONS } from "./StatusPill";

const SHOWN_STATES: StageState[] = ["pending", "running", "succeeded", "partial", "failed", "canceled"];

interface SummaryCountsProps {
  pipelines: Pipeline[];
}

export function SummaryCounts({ pipelines }: SummaryCountsProps) {
  const counts = countRunsByState(pipelines);

  return (
    <div className="summary-counts">
      {SHOWN_STATES.map((state) => (
        <span key={state} className={`summary-count status-${state}`} title={state}>
          <span className="status-icon">{STATE_ICONS[state]}</span>
          {counts[state]}
        </span>
      ))}
    </div>
  );
}

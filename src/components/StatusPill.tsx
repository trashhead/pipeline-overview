import type { StageState } from "../types";

const STATE_ICONS: Record<StageState, string> = {
  succeeded: "✔",
  failed: "✖",
  running: "●",
  pending: "○",
  skipped: "⤼",
  canceled: "⊘",
  partial: "!",
};

interface StatusPillProps {
  label: string;
  state: StageState;
  /** The stage is waiting for an approval. Shown in blue with a clock. */
  awaitingApproval?: boolean;
  /** Where to go to approve. Approving itself happens in Azure DevOps. */
  approvalUrl?: string;
}

export function StatusPill({ label, state, awaitingApproval, approvalUrl }: StatusPillProps) {
  const icon = awaitingApproval ? "◔" : STATE_ICONS[state];
  const stateClass = awaitingApproval ? "awaiting-approval" : `status-${state}`;
  const isRunning = state === "running" && !awaitingApproval;
  const iconElement = isRunning ? (
    <span className="spinner" role="img" aria-label="running" />
  ) : (
    <span className="status-icon">{icon}</span>
  );
  const content = (
    <>
      {iconElement}
      {label}
    </>
  );

  if (awaitingApproval && approvalUrl) {
    return (
      <a
        className={`status-pill ${stateClass} clickable`}
        href={approvalUrl}
        target="_top"
        title="Waiting for approval - open the run in Azure DevOps to approve"
      >
        {content}
      </a>
    );
  }
  return <span className={`status-pill ${stateClass}`}>{content}</span>;
}

export { STATE_ICONS };

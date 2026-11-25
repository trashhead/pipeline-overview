/** The few timeline fields needed to find approvals, independent of which API produced them. */
export interface TimelineApprovalCandidate {
  id: string;
  parentId?: string;
  type: string;
  isInProgress: boolean;
}

/**
 * In a build timeline an approval gate looks like:
 *   Stage -> Checkpoint -> Checkpoint.Approval
 * and the id of the Checkpoint.Approval record is the approval id used by the approvals API.
 */
export function findPendingApprovalId(
  records: TimelineApprovalCandidate[],
  stageId: string,
): string | undefined {
  const checkpointIds = records
    .filter((record) => record.type === "Checkpoint" && record.parentId === stageId)
    .map((record) => record.id);

  const waitingApproval = records.find((record) => {
    const isApproval = record.type === "Checkpoint.Approval";
    const belongsToStage = record.parentId !== undefined && checkpointIds.includes(record.parentId);
    return isApproval && belongsToStage && record.isInProgress;
  });

  return waitingApproval?.id;
}

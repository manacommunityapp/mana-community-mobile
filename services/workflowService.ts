import { apiClient } from './apiClient';

export interface AllowedTransition {
  toStatus: string;
  displayLabel: string;
  reasonRequired: boolean;
}

export interface TransitionHistoryEntry {
  id: number;
  fromStatus: string;
  toStatus: string;
  actorRole: string;
  actorUserId: number;
  reason?: string;
  transitionedAt: string;
  displayLabel?: string;
}

export interface WorkflowTransitionResult {
  success: boolean;
  newStatus: string;
  historyEntry?: TransitionHistoryEntry;
}

export const workflowService = {
  getAllowedTransitions: (
    workflowId: string,
    entityId: string | number,
    currentStatus: string,
  ): Promise<AllowedTransition[]> =>
    apiClient
      .get<AllowedTransition[]>(`/workflow/${workflowId}/${entityId}/transitions`, {
        params: { currentStatus },
      })
      .then((r) => r.data),

  getHistory: (
    entityType: string,
    entityId: string | number,
  ): Promise<TransitionHistoryEntry[]> =>
    apiClient
      .get<TransitionHistoryEntry[]>(`/workflow/${entityType}/${entityId}/history`)
      .then((r) => r.data),

  executeTransition: (
    workflowId: string,
    entityId: string | number,
    currentStatus: string,
    toStatus: string,
    reason?: string,
    idempotencyKey?: string,
  ): Promise<WorkflowTransitionResult> =>
    apiClient
      .post<WorkflowTransitionResult>(
        `/workflow/${workflowId}/${entityId}/transition`,
        { toStatus, reason, idempotencyKey },
        { params: { currentStatus } },
      )
      .then((r) => r.data),
};

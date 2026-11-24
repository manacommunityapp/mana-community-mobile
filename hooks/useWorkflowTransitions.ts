import { useState, useEffect, useCallback } from 'react';
import {
  workflowService,
  AllowedTransition,
  TransitionHistoryEntry,
} from '@/services/workflowService';

interface UseWorkflowTransitionsResult {
  transitions: AllowedTransition[];
  history: TransitionHistoryEntry[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useWorkflowTransitions(
  workflowId: string,
  entityId: string | number,
  currentStatus: string,
  enabled = true,
): UseWorkflowTransitionsResult {
  const [transitions, setTransitions] = useState<AllowedTransition[]>([]);
  const [history, setHistory] = useState<TransitionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled || !entityId || !currentStatus) return;
    setLoading(true);
    try {
      const [t, h] = await Promise.all([
        workflowService.getAllowedTransitions(workflowId, entityId, currentStatus),
        workflowService.getHistory(workflowId, entityId),
      ]);
      setTransitions(t);
      setHistory(h);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load workflow state');
    } finally {
      setLoading(false);
    }
  }, [workflowId, String(entityId), currentStatus, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { transitions, history, loading, error, reload };
}

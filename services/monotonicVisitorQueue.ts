export type GuardVisitorStatus = 'PENDING' | 'APPROVED' | 'DENIED';

export interface MonotonicVisitorEntry {
  id: string;
  visitorName: string;
  flatNo: string;
  status: GuardVisitorStatus;
  version: number;
}

/**
 * Pure monotonic reducer preventing slow HTTP poll responses from reverting fresher
 * WebSocket APPROVED/DENIED updates back to PENDING.
 */
export function mergeMonotonicVisitorQueue(
  prev: Map<string, MonotonicVisitorEntry>,
  incoming: MonotonicVisitorEntry[],
): Map<string, MonotonicVisitorEntry> {
  const next = new Map(prev);
  for (const item of incoming) {
    const existing = next.get(item.id);
    if (!existing || item.version > existing.version) {
      next.set(item.id, item);
    }
  }
  return next;
}

/**
 * Poll coordinator cancelling in-flight HTTP fetches on superseding polls
 * and invalidating stale epochs when WebSocket updates arrive.
 */
export function createPollRaceCoordinator() {
  let epoch = 0;
  let activeController: AbortController | null = null;

  return {
    beginPoll(): { signal: AbortSignal; epoch: number } {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      return { signal: controller.signal, epoch: ++epoch };
    },
    bumpOnWebSocket(): number {
      epoch += 1;
      return epoch;
    },
    isEpochValid(requestEpoch: number): boolean {
      return requestEpoch === epoch;
    },
    abortAll(): void {
      activeController?.abort();
      activeController = null;
    },
  };
}

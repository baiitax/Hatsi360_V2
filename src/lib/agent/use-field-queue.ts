'use client';

/** Browser synchronization for the device-persistent Field queue. */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  QUEUE_CHANGED_EVENT,
  clearQueueItem,
  hasExhaustedAttempts,
  isOnline,
  nextQueuedItem,
  readQueue,
  retryDelayFor,
  setQueueState,
  upsertQueueItem,
  type QueuedPrice,
} from '@/lib/agent/offline-queue';

export interface SendOutcome {
  ok: boolean;
  message: string;
  observationId?: string;
}
export type SendPrice = (item: QueuedPrice) => Promise<SendOutcome>;

export interface FieldQueue {
  items: QueuedPrice[];
  pending: QueuedPrice[];
  stuck: QueuedPrice[];
  online: boolean;
  syncing: boolean;
  lastResult: SendOutcome | null;
  enqueue: (item: QueuedPrice) => void;
  retryNow: (idempotencyKey: string) => Promise<SendOutcome | null>;
  discard: (idempotencyKey: string) => void;
}

function subscribeQueue(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(QUEUE_CHANGED_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(QUEUE_CHANGED_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function getQueueSnapshot(): string {
  return JSON.stringify(readQueue());
}

function subscribeOnline(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function useFieldQueue(send: SendPrice): FieldQueue {
  const queueSnapshot = useSyncExternalStore(subscribeQueue, getQueueSnapshot, () => '[]');
  const online = useSyncExternalStore(subscribeOnline, isOnline, () => true);
  const items = useMemo(() => {
    try { return JSON.parse(queueSnapshot) as QueuedPrice[]; } catch { return []; }
  }, [queueSnapshot]);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SendOutcome | null>(null);

  const sendRef = useRef(send);
  useEffect(() => { sendRef.current = send; }, [send]);
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enqueue = useCallback((item: QueuedPrice) => upsertQueueItem(item), []);
  const discard = useCallback((idempotencyKey: string) => clearQueueItem(idempotencyKey), []);

  const sendOne = useCallback(async (item: QueuedPrice): Promise<SendOutcome> => {
    setQueueState(item.idempotencyKey, 'sending');
    let outcome: SendOutcome;
    try {
      outcome = await sendRef.current(item);
    } catch (error) {
      outcome = {
        ok: false,
        message: error instanceof Error ? `Could not reach the server: ${error.message}` : 'Could not reach the server.',
      };
    }
    if (outcome.ok) clearQueueItem(item.idempotencyKey);
    else setQueueState(item.idempotencyKey, 'failed', { error: outcome.message });
    setLastResult(outcome);
    return outcome;
  }, []);

  const retryNow = useCallback(async (idempotencyKey: string) => {
    const item = readQueue().find((entry) => entry.idempotencyKey === idempotencyKey);
    return item ? sendOne(item) : null;
  }, [sendOne]);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    const pump = async () => {
      if (cancelled || runningRef.current) return;
      runningRef.current = true;
      setSyncing(true);
      try {
        while (!cancelled && isOnline()) {
          const next = nextQueuedItem();
          if (!next) break;
          await sendOne(next);
        }
      } finally {
        runningRef.current = false;
        if (!cancelled) setSyncing(false);
      }
    };
    const start = setTimeout(pump, 0);
    return () => { cancelled = true; clearTimeout(start); };
  }, [items, online, sendOne]);

  useEffect(() => {
    if (!online) return;
    const failed = items.find((item) => item.state === 'failed' && !hasExhaustedAttempts(item));
    if (!failed) return;
    const delay = retryDelayFor(failed.attempts);
    if (delay <= 0) return;
    const timer = setTimeout(() => { if (isOnline()) void sendOne(failed); }, delay);
    timerRef.current = timer;
    return () => clearTimeout(timer);
  }, [items, online, sendOne]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return {
    items,
    pending: items.filter((item) => item.state !== 'synced'),
    stuck: items.filter((item) => hasExhaustedAttempts(item)),
    online,
    syncing,
    lastResult,
    enqueue,
    retryNow,
    discard,
  };
}

import type { RealtimeMessage } from "@/lib/domain/types";

type Listener = (msg: RealtimeMessage) => void;

/**
 * Bus d'événements temps réel (in-process).
 * Les mutations (repo.ts, runner.ts) publient ici ; la route SSE /api/stream relaie aux clients.
 */
class RealtimeBus {
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  publish(msg: RealtimeMessage): void {
    for (const fn of this.listeners) {
      try {
        fn(msg);
      } catch (err) {
        console.error("[bus] listener error", err);
      }
    }
  }

  get size(): number {
    return this.listeners.size;
  }
}

type Global = typeof globalThis & { __atelierBus?: RealtimeBus };

export function bus(): RealtimeBus {
  const g = globalThis as Global;
  if (!g.__atelierBus) g.__atelierBus = new RealtimeBus();
  return g.__atelierBus;
}

import type { RealtimeMessage } from "@/lib/domain/types";
import { bus } from "@/lib/server/events";
import { runner } from "@/lib/server/runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Flux temps réel (Server-Sent Events). */
export async function GET(req: Request) {
  await runner().boot();
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (msg: RealtimeMessage) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        } catch {
          /* flux fermé */
        }
      };
      send({ type: "hello", ts: new Date().toISOString() });
      unsubscribe = bus().subscribe(send);
      heartbeat = setInterval(() => send({ type: "ping" }), 20_000);
      req.signal.addEventListener("abort", () => {
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* déjà fermé */
        }
      });
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

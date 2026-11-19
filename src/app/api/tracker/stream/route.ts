import { backendStore } from "@/services/backendStore";
import { backendMqttSubscriber } from "@/services/backendMqttSubscriber";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  backendMqttSubscriber.init();

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send an initial handshake packet
  const sendEvent = async (event: string, payload: any) => {
    try {
      const dataString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
      await writer.write(encoder.encode(dataString));
    } catch {
      // Client disconnected
    }
  };

  // Immediate snapshot
  sendEvent("snapshot", backendStore.getSnapshot());

  // Listen to future updates
  const unsubscribe = backendStore.subscribe((snapshot) => {
    sendEvent("telemetry", snapshot);
  });

  // Keep-alive ping interval to keep connection open through reverse proxies
  const pingInterval = setInterval(() => {
    sendEvent("ping", { time: Date.now() });
  }, 10000);

  // Clean up on disconnect
  request.signal.addEventListener("abort", () => {
    clearInterval(pingInterval);
    unsubscribe();
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

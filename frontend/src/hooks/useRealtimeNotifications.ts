import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/contexts/ToastContext";
import { NotificationItem } from "@/types";

const STREAM_URL = "/api/notifications/stream";
const TOKEN_KEY = "koda.access_token";

interface SseMessage {
  event: string;
  data: string;
}

function parseSseChunk(chunk: string): SseMessage | null {
  if (!chunk.trim()) return null;
  let event = "message";
  let data = "";
  for (const line of chunk.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data = line.slice(5).trim();
  }
  return { event, data };
}

/**
 * Opens a fetch-based SSE connection to /api/notifications/stream (EventSource
 * cannot send the Authorization header). Reconnects with exponential backoff
 * and invalidates the notifications query + shows a toast on each event.
 */
export function useRealtimeNotifications(): void {
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    let cancelled = false;
    let controller: AbortController | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRetry = (attempt: number) => {
      if (cancelled) return;
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      retryTimer = setTimeout(() => connect(attempt + 1), delay);
    };

    const connect = async (attempt: number) => {
      if (cancelled) return;
      controller = new AbortController();
      try {
        const res = await fetch(STREAM_URL, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`stream status ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const raw = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const msg = parseSseChunk(raw);
            if (msg?.event === "notification" && msg.data) {
              try {
                const notification = JSON.parse(msg.data) as NotificationItem;
                queryClient.invalidateQueries({ queryKey: ["notifications"] });
                toast.push(notification.title, "info");
              } catch {
                // ignore malformed payloads
              }
            }
            boundary = buffer.indexOf("\n\n");
          }
        }
      } catch {
        if (!cancelled) scheduleRetry(attempt);
      }
    };

    connect(0);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      controller?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

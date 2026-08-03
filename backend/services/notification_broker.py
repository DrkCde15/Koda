"""In-memory pub/sub broker for realtime notifications (SSE).

Each user id keeps a set of subscriber queues (one per open SSE connection).
Publishing to a user enqueues the payload on every subscription; queues that
are full or gone are dropped silently. The broker is process-local: with
multiple Gunicorn workers each worker only receives events published inside
itself. Swap this for a Redis pub/sub channel when running multi-worker.
"""
import queue
import threading
from typing import Any


class NotificationBroker:
    """Thread-safe broadcast of notification payloads per user."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._subscribers: dict[int, set[queue.Queue]] = {}

    def subscribe(self, user_id: int) -> queue.Queue:
        """Open a new subscription queue for a user."""
        q: queue.Queue = queue.Queue(maxsize=100)
        with self._lock:
            self._subscribers.setdefault(user_id, set()).add(q)
        return q

    def unsubscribe(self, user_id: int, q: queue.Queue) -> None:
        """Remove a subscription queue for a user."""
        with self._lock:
            queues = self._subscribers.get(user_id)
            if queues is not None:
                queues.discard(q)
                if not queues:
                    self._subscribers.pop(user_id, None)

    def publish(self, user_id: int, payload: dict[str, Any]) -> bool:
        """Enqueue a payload for all subscriptions of a user.

        Returns True when at least one subscriber received it.
        """
        with self._lock:
            queues = list(self._subscribers.get(user_id, ()))
        for q in queues:
            try:
                q.put_nowait(payload)
            except queue.Full:
                pass
        return bool(queues)


broker = NotificationBroker()

"""Realtime notification stream (Server-Sent Events)."""
import json
import queue

from flask import Blueprint, Response, current_app
from flask.helpers import stream_with_context
from flask_jwt_extended import jwt_required

from middlewares.auth import get_current_user
from services.notification_broker import broker

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.get("/notifications/stream")
@jwt_required()
def stream():
    """Keep-alive SSE connection that forwards new notifications.

    Clients must send the JWT in the Authorization header (use fetch-based
    streaming instead of EventSource). Emitted events: ``connected`` on open,
    then ``notification`` per new notification and ``:`` heartbeat comments.
    """
    user = get_current_user()
    heartbeat = current_app.config.get("SSE_HEARTBEAT_SECONDS", 15)

    def event_stream():
        q = broker.subscribe(user.id)
        try:
            yield "event: connected\ndata: {}\n\n"
            while True:
                try:
                    payload = q.get(timeout=heartbeat)
                    yield f"event: notification\ndata: {json.dumps(payload)}\n\n"
                except queue.Empty:
                    yield ": ping\n\n"
        finally:
            broker.unsubscribe(user.id, q)

    return Response(
        stream_with_context(event_stream()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

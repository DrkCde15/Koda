"""Reusable model mixins."""
from datetime import datetime, timezone

from extensions import db


def utcnow() -> datetime:
    """Timezone-aware UTC timestamp (avoids the deprecated ``datetime.utcnow``)."""
    return datetime.now(timezone.utc)


class TimestampMixin:
    """Adds created/updated timestamps to a model."""

    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )


class PKMixin:
    """Adds an integer primary key."""

    id = db.Column(db.Integer, primary_key=True)

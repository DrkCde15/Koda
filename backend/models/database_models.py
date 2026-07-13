"""Notion-style relational databases.

A workspace owns Databases. Each Database has typed Properties (columns) and
Items (rows). Every cell value is stored relationally in DatabaseItemValue so
the data stays queryable, not buried in a JSON blob.
"""
from extensions import db
from models.base import PKMixin, TimestampMixin


class Database(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "databases"

    workspace_id = db.Column(
        db.Integer, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = db.Column(db.String(120), nullable=False)
    icon = db.Column(db.String(16), nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "name": self.name,
            "icon": self.icon,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DatabaseProperty(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "database_properties"

    database_id = db.Column(
        db.Integer, db.ForeignKey("databases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = db.Column(db.String(120), nullable=False)
    type = db.Column(db.String(32), nullable=False, default="text")
    options = db.Column(db.JSON, nullable=True, default=dict)
    position = db.Column(db.Integer, default=0, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "database_id": self.database_id,
            "name": self.name,
            "type": self.type,
            "options": self.options or {},
            "position": self.position,
        }


class DatabaseItem(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "database_items"

    database_id = db.Column(
        db.Integer, db.ForeignKey("databases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position = db.Column(db.Integer, default=0, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "database_id": self.database_id,
            "position": self.position,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DatabaseItemValue(db.Model, PKMixin, TimestampMixin):
    __tablename__ = "database_item_values"

    item_id = db.Column(
        db.Integer, db.ForeignKey("database_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    property_id = db.Column(
        db.Integer,
        db.ForeignKey("database_properties.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    value_text = db.Column(db.Text, nullable=True)
    value_number = db.Column(db.Float, nullable=True)
    value_date = db.Column(db.DateTime, nullable=True)
    value_select = db.Column(db.String(120), nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "item_id": self.item_id,
            "property_id": self.property_id,
            "value_text": self.value_text,
            "value_number": self.value_number,
            "value_date": self.value_date.isoformat() if self.value_date else None,
            "value_select": self.value_select,
        }

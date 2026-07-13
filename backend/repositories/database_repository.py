"""Data access for Notion-style databases."""
from extensions import db
from models.database_models import (
    Database,
    DatabaseItem,
    DatabaseItemValue,
    DatabaseProperty,
)


class DatabaseRepository:
    @staticmethod
    def create(workspace_id: int, name: str, icon: str | None) -> Database:
        db_ = Database(workspace_id=workspace_id, name=name, icon=icon)
        db.session.add(db_)
        db.session.flush()
        return db_

    @staticmethod
    def get_by_id(database_id: int) -> Database | None:
        return db.session.get(Database, database_id)

    @staticmethod
    def list_by_workspace(workspace_id: int) -> list[Database]:
        return (
            db.session.query(Database)
            .filter(Database.workspace_id == workspace_id)
            .order_by(Database.id)
            .all()
        )

    @staticmethod
    def delete(database: Database) -> None:
        db.session.delete(database)

    @staticmethod
    def create_property(
        database_id: int, name: str, type_: str, options: dict | None, position: int
    ) -> DatabaseProperty:
        prop = DatabaseProperty(
            database_id=database_id,
            name=name,
            type=type_,
            options=options or {},
            position=position,
        )
        db.session.add(prop)
        db.session.flush()
        return prop

    @staticmethod
    def get_property(prop_id: int) -> DatabaseProperty | None:
        return db.session.get(DatabaseProperty, prop_id)

    @staticmethod
    def list_properties(database_id: int) -> list[DatabaseProperty]:
        return (
            db.session.query(DatabaseProperty)
            .filter(DatabaseProperty.database_id == database_id)
            .order_by(DatabaseProperty.position, DatabaseProperty.id)
            .all()
        )

    @staticmethod
    def delete_property(prop: DatabaseProperty) -> None:
        db.session.delete(prop)

    @staticmethod
    def create_item(database_id: int, position: int) -> DatabaseItem:
        item = DatabaseItem(database_id=database_id, position=position)
        db.session.add(item)
        db.session.flush()
        return item

    @staticmethod
    def get_item(item_id: int) -> DatabaseItem | None:
        return db.session.get(DatabaseItem, item_id)

    @staticmethod
    def list_items(database_id: int) -> list[DatabaseItem]:
        return (
            db.session.query(DatabaseItem)
            .filter(DatabaseItem.database_id == database_id)
            .order_by(DatabaseItem.position, DatabaseItem.id)
            .all()
        )

    @staticmethod
    def delete_item(item: DatabaseItem) -> None:
        db.session.delete(item)

    @staticmethod
    def set_value(item_id: int, property_id: int, column: str, value) -> None:
        existing = (
            db.session.query(DatabaseItemValue)
            .filter(
                DatabaseItemValue.item_id == item_id,
                DatabaseItemValue.property_id == property_id,
            )
            .first()
        )
        if existing is None:
            existing = DatabaseItemValue(item_id=item_id, property_id=property_id)
            db.session.add(existing)
        existing.value_text = None
        existing.value_number = None
        existing.value_date = None
        existing.value_select = None
        setattr(existing, column, value)

    @staticmethod
    def delete_value(item_id: int, property_id: int) -> None:
        db.session.query(DatabaseItemValue).filter(
            DatabaseItemValue.item_id == item_id,
            DatabaseItemValue.property_id == property_id,
        ).delete()

    @staticmethod
    def commit() -> None:
        db.session.commit()

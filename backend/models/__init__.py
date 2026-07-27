"""Aggregate model imports.

Importing this module registers every model with SQLAlchemy so that
``flask db migrate`` can detect the full schema.
"""
from models.user import Role, User
from models.workspace_models import Invite, Workspace, WorkspaceMember
from models.page import Page, PageRevision
from models.block import Block, BlockType
from models.file import File
from models.comment import Notification, PageComment
from models.activity import PagePresence, WorkspaceActivity
from models.database_models import (
    Database,
    DatabaseItem,
    DatabaseItemValue,
    DatabaseProperty,
)

__all__ = [
    "Role",
    "User",
    "Workspace",
    "WorkspaceMember",
    "Invite",
    "Page",
    "PageRevision",
    "Block",
    "BlockType",
    "File",
    "Database",
    "DatabaseProperty",
    "DatabaseItem",
    "DatabaseItemValue",
    "PageComment",
    "Notification",
    "PagePresence",
    "WorkspaceActivity",
]

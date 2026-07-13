"""Aggregate model imports.

Importing this module registers every model with SQLAlchemy so that
``flask db migrate`` can detect the full schema.
"""
from models.user import Role, User
from models.workspace_models import Invite, Workspace, WorkspaceMember
from models.page import Page, PageRevision
from models.block import Block, BlockType
from models.file import File

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
]

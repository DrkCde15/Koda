"""Block HTTP controllers."""
from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from middlewares.auth import get_current_user
from middlewares.responses import error, success
from schemas.block_schema import BlockCreateSchema, BlockUpdateSchema
from services.block_service import BlockService

blocks_bp = Blueprint("blocks", __name__, url_prefix="/blocks")


@blocks_bp.post("")
@jwt_required()
def create():
    user = get_current_user()
    data = BlockCreateSchema().load(request.get_json(force=True, silent=True) or {})
    block = BlockService.create(
        user.id,
        data["page_id"],
        data["type"],
        data.get("content"),
        data.get("parent_block_id"),
        data.get("position"),
    )
    return success("Block created", block, 201)


@blocks_bp.get("")
@jwt_required()
def list_blocks():
    user = get_current_user()
    page_id = request.args.get("page_id", type=int)
    if not page_id:
        return error("page_id is required", None, 400)
    blocks = BlockService.list_blocks(user.id, page_id)
    return success("Blocks retrieved", blocks)


@blocks_bp.put("/<int:block_id>")
@jwt_required()
def update_block(block_id: int):
    user = get_current_user()
    data = BlockUpdateSchema().load(
        request.get_json(force=True, silent=True) or {}, partial=True
    )
    block = BlockService.update(
        user.id,
        block_id,
        block_type=data.get("type"),
        content=data.get("content"),
        position=data.get("position"),
    )
    return success("Block updated", block)


@blocks_bp.delete("/<int:block_id>")
@jwt_required()
def delete_block(block_id: int):
    user = get_current_user()
    BlockService.delete(user.id, block_id)
    return success("Block deleted")

"""notion-style databases

Revision ID: 3f1a9c2b7d40
Revises: 9d539187ba55
Create Date: 2026-07-13 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = '3f1a9c2b7d40'
down_revision = '9d539187ba55'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'databases',
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('icon', sa.String(length=16), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_databases_workspace_id'), 'databases', ['workspace_id'], unique=False)

    op.create_table(
        'database_properties',
        sa.Column('database_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('type', sa.String(length=32), nullable=False),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['database_id'], ['databases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_database_properties_database_id'),
        'database_properties',
        ['database_id'],
        unique=False,
    )

    op.create_table(
        'database_items',
        sa.Column('database_id', sa.Integer(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['database_id'], ['databases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_database_items_database_id'), 'database_items', ['database_id'], unique=False
    )

    op.create_table(
        'database_item_values',
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('value_text', sa.Text(), nullable=True),
        sa.Column('value_number', sa.Float(), nullable=True),
        sa.Column('value_date', sa.DateTime(), nullable=True),
        sa.Column('value_select', sa.String(length=120), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['item_id'], ['database_items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['property_id'], ['database_properties.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_database_item_values_item_id'),
        'database_item_values',
        ['item_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_database_item_values_property_id'),
        'database_item_values',
        ['property_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_database_item_values_property_id'), table_name='database_item_values')
    op.drop_index(op.f('ix_database_item_values_item_id'), table_name='database_item_values')
    op.drop_table('database_item_values')
    op.drop_index(op.f('ix_database_items_database_id'), table_name='database_items')
    op.drop_table('database_items')
    op.drop_index(op.f('ix_database_properties_database_id'), table_name='database_properties')
    op.drop_table('database_properties')
    op.drop_index(op.f('ix_databases_workspace_id'), table_name='databases')
    op.drop_table('databases')

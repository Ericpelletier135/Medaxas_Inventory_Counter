import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.sales_order import SalesOrder
from app.models.sales_order_line import SalesOrderLine


async def get_sales_order_with_relations(
    db: AsyncSession, order_id: uuid.UUID
) -> Optional[SalesOrder]:
    """Retrieve a Sales Order fully populated with its lines and items."""
    stmt = (
        select(SalesOrder)
        .options(
            selectinload(SalesOrder.sales_order_lines).selectinload(SalesOrderLine.item)
        )
        .where(SalesOrder.sales_order_id == order_id)
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def get_sales_orders_by_ids(
    db: AsyncSession, order_ids: List[uuid.UUID]
) -> List[SalesOrder]:
    """Retrieve multiple Sales Orders fully populated, given their IDs."""
    stmt = (
        select(SalesOrder)
        .options(
            selectinload(SalesOrder.sales_order_lines).selectinload(SalesOrderLine.item)
        )
        .where(SalesOrder.sales_order_id.in_(order_ids))
        .order_by(SalesOrder.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_all_sales_orders(db: AsyncSession) -> List[SalesOrder]:
    """Retrieve all Sales Orders fully populated."""
    stmt = (
        select(SalesOrder)
        .options(
            selectinload(SalesOrder.sales_order_lines).selectinload(SalesOrderLine.item)
        )
        .order_by(SalesOrder.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()

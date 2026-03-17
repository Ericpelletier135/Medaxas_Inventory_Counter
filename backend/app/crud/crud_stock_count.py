import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock_count_session import StockCountSession
from app.models.stock_count_line import StockCountLine


async def get_session_with_relations(
    db: AsyncSession, session_id: uuid.UUID
) -> Optional[StockCountSession]:
    """Retrieve a Stock Count Session fully populated with its lines and items."""
    stmt = (
        select(StockCountSession)
        .options(
            selectinload(StockCountSession.stock_count_lines).selectinload(StockCountLine.item)
        )
        .where(StockCountSession.stock_count_session_id == session_id)
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def get_all_sessions_with_relations(
    db: AsyncSession, status_filter: Optional[str] = None
) -> List[StockCountSession]:
    """Retrieve all Stock Count Sessions fully populated, optionally filtered by status."""
    stmt = (
        select(StockCountSession)
        .options(
            selectinload(StockCountSession.stock_count_lines).selectinload(StockCountLine.item)
        )
        .order_by(StockCountSession.created_at.desc())
    )
    
    if status_filter:
        stmt = stmt.where(StockCountSession.status == status_filter)
        
    result = await db.execute(stmt)
    return result.scalars().all()

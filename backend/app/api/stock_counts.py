from datetime import date, datetime, timezone
from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_async_session
from app.api.auth import current_active_user
from app.models.user import User
from app.models.item import Item
from app.models.stock_count_session import StockCountSession
from app.models.stock_count_line import StockCountLine
from app.schemas.stock_count import (
    StockCountSessionCreate,
    StockCountSessionRead,
    StockCountLineUpdate,
    StockCountLineRead
)
from app.crud.crud_stock_count import (
    get_session_with_relations,
    get_all_sessions_with_relations
)

router = APIRouter(prefix="/api/stock-count-sessions", tags=["stock-counts"])


@router.post("", response_model=StockCountSessionRead, status_code=status.HTTP_201_CREATED)
async def create_stock_count_session(
    session_in: StockCountSessionCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Creates a new Stock Count Session.
    Snapshots all active items into StockCountLines.
    """
    # 1. Fetch all active items
    stmt = select(Item).where(Item.status == "active")
    result = await db.execute(stmt)
    active_items = result.scalars().all()

    if not active_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active items available to count."
        )

    # 2. Create the Session
    count_date = session_in.count_date or date.today()
    new_session = StockCountSession(
        count_date=count_date,
        notes=session_in.notes,
        created_by_user_id=current_user.id,
        status="open"
    )
    db.add(new_session)
    await db.flush()  # To get the session ID

    # 3. Create lines for all active items
    lines = []
    for item in active_items:
        line = StockCountLine(
            stock_count_session_id=new_session.stock_count_session_id,
            item_id=item.id,
            previous_quantity=item.current_quantity,
            counted_quantity=None,
            variance=None
        )
        lines.append(line)
    
    db.add_all(lines)
    await db.commit()
    await db.refresh(new_session)

    # Reload the relationships to return the full read model
    return await get_session_with_relations(db, new_session.stock_count_session_id)


@router.get("", response_model=List[StockCountSessionRead])
async def list_stock_count_sessions(
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """List all sessions. Optionally filter by status."""
    return await get_all_sessions_with_relations(db, status_filter)


@router.get("/{session_id}", response_model=StockCountSessionRead)
async def get_stock_count_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Get a specific session and all its lines."""
    session = await get_session_with_relations(db, session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return session


@router.patch("/{session_id}/lines/{line_id}", response_model=StockCountLineRead)
async def update_count_line(
    session_id: uuid.UUID,
    line_id: uuid.UUID,
    line_in: StockCountLineUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Update a physical count for an item. 
    Auto-computes variance. Transitions session to in_progress if open.
    """
    # Negative check
    if line_in.counted_quantity < 0:
        raise HTTPException(status_code=422, detail="Counted quantity cannot be negative")

    # Fetch Session
    stmt_session = select(StockCountSession).where(StockCountSession.stock_count_session_id == session_id)
    result_session = await db.execute(stmt_session)
    session = result_session.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.status not in ("open", "in_progress"):
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot update counts on a {session.status} session."
        )

    # Fetch Line
    stmt_line = (
        select(StockCountLine)
        .options(selectinload(StockCountLine.item))
        .where(
            and_(
                StockCountLine.stock_count_line_id == line_id,
                StockCountLine.stock_count_session_id == session_id
            )
        )
    )
    result_line = await db.execute(stmt_line)
    line = result_line.scalars().first()

    if not line:
        raise HTTPException(status_code=404, detail="Line not found in this session")

    # Update line
    line.counted_quantity = line_in.counted_quantity
    line.variance = line_in.counted_quantity - line.previous_quantity
    if line_in.notes is not None:
        line.notes = line_in.notes

    # Auto-transition status
    if session.status == "open":
        session.status = "in_progress"

    await db.commit()
    await db.refresh(line)
    
    return line


@router.post("/{session_id}/complete", response_model=StockCountSessionRead)
async def complete_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Complete the session and update the actual inventory quantities.
    Enforces the 'Accidental Wipe' guard: blocks completion if any lines are NULL (uncounted).
    """
    stmt = (
        select(StockCountSession)
        .options(selectinload(StockCountSession.stock_count_lines))
        .where(StockCountSession.stock_count_session_id == session_id)
    )
    result = await db.execute(stmt)
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.status not in ("open", "in_progress"):
        raise HTTPException(status_code=400, detail=f"Session is already {session.status}")

    # 'ACCIDENTAL WIPE' GUARD
    uncounted_lines = [line for line in session.stock_count_lines if line.counted_quantity is None]
    if uncounted_lines:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot complete session. There are {len(uncounted_lines)} uncounted items. Check all items or enter 0 if empty."
        )

    # Apply counts to real inventory
    for line in session.stock_count_lines:
        stmt_item = update(Item).where(Item.id == line.item_id).values(
            current_quantity=line.counted_quantity
        )
        await db.execute(stmt_item)
    
    # Finalize session
    session.status = "completed"
    session.completed_by_user_id = current_user.id
    session.completed_at = datetime.now(timezone.utc)

    await db.commit()
    
    # Reload for full response
    return await get_session_with_relations(db, session_id)

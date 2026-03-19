from datetime import date, datetime, timezone
from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_async_session
from app.api.auth import current_active_user
from app.models.user import User
from app.models.stock_count_session import StockCountSession
from app.models.stock_count_line import StockCountLine
from app.models.sales_order import SalesOrder
from app.models.sales_order_line import SalesOrderLine
from app.schemas.sales_order import SalesOrderRead
from app.crud.crud_sales_order import (
    get_sales_order_with_relations,
    get_sales_orders_by_ids,
    get_all_sales_orders
)
from app.crud.crud_stock_count import get_session_with_relations

router = APIRouter(prefix="/api/sales-orders", tags=["sales-orders"])


@router.post("/generate/{session_id}", response_model=List[SalesOrderRead])
async def generate_sales_orders(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """
    Generate Sales Orders for a completed Stock Count Session.
    Groups items by Vendor. 
    Only orders items where counted_quantity < minimum_quantity.
    """
    # 1. Fetch the Session
    session = await get_session_with_relations(db, session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.status != "completed":
        raise HTTPException(
            status_code=400, 
            detail="Can only generate orders for completed sessions."
        )

    # 2. Check for existing orders (Duplicate Prevention)
    stmt_existing = select(SalesOrder).where(SalesOrder.stock_count_session_id == session_id)
    res_existing = await db.execute(stmt_existing)
    if res_existing.scalars().first():
        raise HTTPException(
            status_code=400, 
            detail="Sales orders have already been generated for this session."
        )

    # 3. Filter lines needing orders and group by vendor
    vendor_groups = {}  # vendor_id -> list of lines
    
    for line in session.stock_count_lines:
        item = line.item
        counted_qty = line.counted_quantity or 0
        
        if counted_qty < item.minimum_quantity:
            vid = item.vendor_id
            if vid not in vendor_groups:
                vendor_groups[vid] = []
            vendor_groups[vid].append(line)

    if not vendor_groups:
        # Retur an empty list with 200, frontend can show None needed
        return []

    # 4. Generate Orders per Vendor group
    created_orders = []
    today_str = date.today().strftime("%Y%m%d")

    stmt_count = select(func.count(SalesOrder.sales_order_id)).where(SalesOrder.order_date == date.today())
    res_count = await db.execute(stmt_count)
    daily_count = res_count.scalar() or 0

    for vendor_id, lines in vendor_groups.items():
        daily_count += 1
        order_number = f"SO-{today_str}-{daily_count:04d}"
        
        new_order = SalesOrder(
            vendor_id=vendor_id,
            stock_count_session_id=session_id,
            created_by_user_id=current_user.id,
            status="draft",
            order_number=order_number,
            order_date=date.today(),
            total_items=len(lines)
        )
        db.add(new_order)
        await db.flush()
        
        order_lines = []
        for line in lines:
            item = line.item
            counted_qty = line.counted_quantity or 0
            
            if item.reorder_quantity > 0:
                quantity_to_order = item.reorder_quantity
            else:
                quantity_to_order = item.minimum_quantity - counted_qty
                
            # Floor at 0 just in case
            quantity_to_order = max(0, quantity_to_order)

            new_line = SalesOrderLine(
                sales_order_id=new_order.sales_order_id,
                item_id=item.id,
                current_quantity=counted_qty,
                minimum_quantity=item.minimum_quantity,
                quantity_to_order=quantity_to_order,
                unit_of_measure=item.unit_of_measure
            )
            order_lines.append(new_line)
            
        db.add_all(order_lines)
        created_orders.append(new_order.sales_order_id)

    await db.commit()

    # 5. Load the created orders to return
    return await get_sales_orders_by_ids(db, created_orders)


@router.get("", response_model=List[SalesOrderRead])
async def list_sales_orders(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """List all sales orders."""
    return await get_all_sales_orders(db)


@router.get("/{order_id}", response_model=SalesOrderRead)
async def get_sales_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    """Get a specific sales order."""
    order = await get_sales_order_with_relations(db, order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Sales Order not found")
        
    return order

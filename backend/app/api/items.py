from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import current_active_user
from app.db.session import get_async_session
from app.models.item import Item
from app.models.vendor import Vendor
from app.schemas.item import ItemCreate, ItemRead, ItemUpdate


router = APIRouter(
    prefix="/api/items",
    tags=["items"],
    dependencies=[Depends(current_active_user)],
)


@router.post(
    "",
    response_model=ItemRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_item(
    item_in: ItemCreate,
    session: AsyncSession = Depends(get_async_session),
):
    if item_in.sku:
        sku_query = select(Item).where(Item.sku == item_in.sku)
        sku_result = await session.execute(sku_query)
        existing_sku = sku_result.scalars().first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SKU_ALREADY_EXISTS",
            )

    if item_in.vendor_id:
        vendor_query = select(Vendor).where(Vendor.vendor_id == item_in.vendor_id)
        vendor_result = await session.execute(vendor_query)
        vendor = vendor_result.scalars().first()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VENDOR_NOT_FOUND",
            )

    item = Item(
        name=item_in.name,
        sku=item_in.sku,
        unit_of_measure=item_in.unit_of_measure,
        current_quantity=item_in.current_quantity,
        minimum_quantity=item_in.minimum_quantity,
        reorder_quantity=item_in.reorder_quantity,
        status=item_in.status,
        vendor_id=item_in.vendor_id,
        barcode=item_in.barcode,
    )

    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


@router.get("", response_model=List[ItemRead])
async def list_items(
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(select(Item))
    items = result.scalars().all()
    return items


@router.get("/{item_id}", response_model=ItemRead)
async def get_item(
    item_id: str,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(select(Item).where(Item.id == item_id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ITEM_NOT_FOUND",
        )
    return item


@router.patch("/{item_id}", response_model=ItemRead)
async def update_item(
    item_id: str,
    item_in: ItemUpdate,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(select(Item).where(Item.id == item_id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ITEM_NOT_FOUND",
        )

    update_data = item_in.model_dump(exclude_unset=True)

    new_sku = update_data.get("sku")
    if new_sku and new_sku != item.sku:
        sku_query = select(Item).where(Item.sku == new_sku)
        sku_result = await session.execute(sku_query)
        existing_sku = sku_result.scalars().first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SKU_ALREADY_EXISTS",
            )

    new_vendor_id = update_data.get("vendor_id")
    if new_vendor_id:
        vendor_query = select(Vendor).where(Vendor.vendor_id == new_vendor_id)
        vendor_result = await session.execute(vendor_query)
        vendor = vendor_result.scalars().first()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VENDOR_NOT_FOUND",
            )

    for field, value in update_data.items():
        setattr(item, field, value)

    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_item(
    item_id: str,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(select(Item).where(Item.id == item_id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ITEM_NOT_FOUND",
        )

    await session.delete(item)
    await session.commit()


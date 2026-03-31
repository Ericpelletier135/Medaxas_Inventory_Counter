import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import current_active_user
from app.db.session import get_async_session
from app.models.item import Item
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.item import (
    ItemBulkImportRequest,
    ItemBulkImportResponse,
    ItemCreate,
    ItemRead,
    ItemUpdate,
)


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
    current_user: User = Depends(current_active_user),
):
    if item_in.sku:
        sku_query = select(Item).where(
            Item.owner_user_id == current_user.id,
            Item.sku == item_in.sku,
        )
        sku_result = await session.execute(sku_query)
        existing_sku = sku_result.scalars().first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SKU_ALREADY_EXISTS",
            )

    if item_in.vendor_id:
        vendor_query = select(Vendor).where(
            Vendor.vendor_id == item_in.vendor_id,
            Vendor.owner_user_id == current_user.id,
        )
        vendor_result = await session.execute(vendor_query)
        vendor = vendor_result.scalars().first()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VENDOR_NOT_FOUND",
            )

    item = Item(
        owner_user_id=current_user.id,
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
    current_user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Item)
        .where(Item.owner_user_id == current_user.id)
        .order_by(Item.created_at.desc())
    )
    items = result.scalars().all()
    return items


@router.get("/{item_id}", response_model=ItemRead)
async def get_item(
    item_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Item).where(
            Item.id == item_id,
            Item.owner_user_id == current_user.id,
        )
    )
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
    current_user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Item).where(
            Item.id == item_id,
            Item.owner_user_id == current_user.id,
        )
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ITEM_NOT_FOUND",
        )

    update_data = item_in.model_dump(exclude_unset=True)

    new_sku = update_data.get("sku")
    if new_sku and new_sku != item.sku:
        sku_query = select(Item).where(
            Item.owner_user_id == current_user.id,
            Item.sku == new_sku,
        )
        sku_result = await session.execute(sku_query)
        existing_sku = sku_result.scalars().first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SKU_ALREADY_EXISTS",
            )

    new_vendor_id = update_data.get("vendor_id")
    if new_vendor_id:
        vendor_query = select(Vendor).where(
            Vendor.vendor_id == new_vendor_id,
            Vendor.owner_user_id == current_user.id,
        )
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
    current_user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Item).where(
            Item.id == item_id,
            Item.owner_user_id == current_user.id,
        )
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ITEM_NOT_FOUND",
        )

    await session.delete(item)
    await session.commit()


@router.post(
    "/bulk-import",
    response_model=ItemBulkImportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def bulk_import_items(
    payload: ItemBulkImportRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    field_types = {
        "name": "str",
        "sku": "str",
        "unit_of_measure": "str",
        "current_quantity": "int",
        "minimum_quantity": "int",
        "reorder_quantity": "int",
        "status": "str",
        "vendor_id": "uuid",
        "barcode": "str",
    }
    required_fields = {"name"}
    allowed_statuses = {"active", "inactive"}

    mapping = payload.mapping
    rows = payload.rows
    errors: list[str] = []
    created_count = 0
    skipped_count = 0

    if "name" not in mapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MISSING_REQUIRED_MAPPING:name",
        )

    mapped_fields = set(mapping.keys())
    invalid_fields = mapped_fields.difference(field_types.keys())
    if invalid_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"INVALID_MAPPED_FIELDS:{','.join(sorted(invalid_fields))}",
        )

    existing_skus_result = await session.execute(
        select(Item.sku).where(
            Item.owner_user_id == current_user.id,
            Item.sku.is_not(None),
        )
    )
    used_skus = {sku for sku in existing_skus_result.scalars().all() if sku}
    pending_skus: set[str] = set()

    items_to_create: list[Item] = []
    for idx, row in enumerate(rows, start=1):
        converted: dict[str, object] = {}
        row_has_error = False

        for field_name, column_name in mapping.items():
            raw = row.get(column_name, "")
            raw = raw.strip() if isinstance(raw, str) else ""

            if raw == "":
                continue

            field_type = field_types[field_name]
            try:
                if field_type == "int":
                    converted[field_name] = int(float(raw))
                elif field_type == "uuid":
                    converted[field_name] = uuid.UUID(raw)
                else:
                    converted[field_name] = raw
            except ValueError:
                errors.append(f"Row {idx}: invalid {field_name} value '{raw}'.")
                row_has_error = True
                break

        if row_has_error:
            skipped_count += 1
            continue

        for req_field in required_fields:
            if not converted.get(req_field):
                errors.append(f"Row {idx}: missing required field '{req_field}'.")
                row_has_error = True
                break

        if row_has_error:
            skipped_count += 1
            continue

        if "status" in converted:
            status_value = str(converted["status"]).lower()
            if status_value not in allowed_statuses:
                errors.append(
                    f"Row {idx}: invalid status '{converted['status']}'. Use active/inactive."
                )
                skipped_count += 1
                continue
            converted["status"] = status_value

        if "vendor_id" in converted:
            vendor_id = converted["vendor_id"]
            vendor_query = select(Vendor).where(
                Vendor.vendor_id == vendor_id,
                Vendor.owner_user_id == current_user.id,
            )
            vendor_result = await session.execute(vendor_query)
            vendor = vendor_result.scalars().first()
            if not vendor:
                errors.append(f"Row {idx}: vendor_id not found.")
                skipped_count += 1
                continue

        sku_value = converted.get("sku")
        if isinstance(sku_value, str) and sku_value:
            if sku_value in used_skus or sku_value in pending_skus:
                errors.append(f"Row {idx}: SKU '{sku_value}' already exists.")
                skipped_count += 1
                continue
            pending_skus.add(sku_value)

        items_to_create.append(Item(owner_user_id=current_user.id, **converted))

    if items_to_create:
        session.add_all(items_to_create)
        await session.commit()
        created_count = len(items_to_create)
    else:
        await session.rollback()

    return ItemBulkImportResponse(
        created_count=created_count,
        skipped_count=skipped_count,
        errors=errors,
    )


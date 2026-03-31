from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import current_active_user
from app.db.session import get_async_session
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreate, VendorRead, VendorUpdate


router = APIRouter(
    prefix="/api/vendors",
    tags=["vendors"],
    dependencies=[Depends(current_active_user)],
)


@router.post(
    "",
    response_model=VendorRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_vendor(
    vendor_in: VendorCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    query = select(Vendor).where(
        Vendor.owner_user_id == current_user.id,
        Vendor.vendor_name == vendor_in.vendor_name,
    )
    result = await session.execute(query)
    existing = result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="VENDOR_NAME_ALREADY_EXISTS",
        )

    vendor = Vendor(
        owner_user_id=current_user.id,
        vendor_name=vendor_in.vendor_name,
        contact_name=vendor_in.contact_name,
        email=vendor_in.email,
        phone_number=vendor_in.phone_number,
        address=vendor_in.address,
        status=vendor_in.status,
    )

    session.add(vendor)
    await session.commit()
    await session.refresh(vendor)
    return vendor


@router.get("", response_model=List[VendorRead])
async def list_vendors(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Vendor)
        .where(Vendor.owner_user_id == current_user.id)
        .order_by(Vendor.created_at.desc())
    )
    vendors = result.scalars().all()
    return vendors


@router.get("/{vendor_id}", response_model=VendorRead)
async def get_vendor(
    vendor_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Vendor).where(
            Vendor.vendor_id == vendor_id,
            Vendor.owner_user_id == current_user.id,
        )
    )
    vendor = result.scalars().first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VENDOR_NOT_FOUND",
        )
    return vendor


@router.patch("/{vendor_id}", response_model=VendorRead)
async def update_vendor(
    vendor_id: str,
    vendor_in: VendorUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Vendor).where(
            Vendor.vendor_id == vendor_id,
            Vendor.owner_user_id == current_user.id,
        )
    )
    vendor = result.scalars().first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VENDOR_NOT_FOUND",
        )

    update_data = vendor_in.model_dump(exclude_unset=True)

    new_name = update_data.get("vendor_name")
    if new_name and new_name != vendor.vendor_name:
        query = select(Vendor).where(
            Vendor.owner_user_id == current_user.id,
            Vendor.vendor_name == new_name,
        )
        result = await session.execute(query)
        existing = result.scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VENDOR_NAME_ALREADY_EXISTS",
            )

    for field, value in update_data.items():
        setattr(vendor, field, value)

    session.add(vendor)
    await session.commit()
    await session.refresh(vendor)
    return vendor


@router.delete(
    "/{vendor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_vendor(
    vendor_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Vendor).where(
            Vendor.vendor_id == vendor_id,
            Vendor.owner_user_id == current_user.id,
        )
    )
    vendor = result.scalars().first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VENDOR_NOT_FOUND",
        )

    await session.delete(vendor)
    await session.commit()

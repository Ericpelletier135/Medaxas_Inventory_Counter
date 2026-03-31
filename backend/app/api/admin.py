import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_users.password import PasswordHelper
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import current_admin_user
from app.crud.crud_sales_order import get_all_sales_orders
from app.crud.crud_stock_count import get_all_sessions_with_relations
from app.db.session import get_async_session
from app.models.item import Item
from app.models.sales_order import SalesOrder
from app.models.stock_count_session import StockCountSession
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.item import ItemRead
from app.schemas.user import AdminUserCreate, AdminUserDataRead, AdminUserUpdate, UserRead
from app.schemas.vendor import VendorRead


router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(current_admin_user)],
)


@router.get("/users", response_model=list[UserRead])
async def list_users(
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: AdminUserCreate,
    session: AsyncSession = Depends(get_async_session),
):
    existing = await session.execute(select(User).where(User.email == user_in.email))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="EMAIL_ALREADY_EXISTS",
        )

    password_helper = PasswordHelper()
    is_active = user_in.is_active and user_in.status != "inactive"
    user = User(
        email=user_in.email,
        hashed_password=password_helper.hash(user_in.password),
        is_active=is_active,
        is_superuser=user_in.is_admin,
        is_verified=True,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        is_admin=user_in.is_admin,
        role="admin" if user_in.is_admin else "user",
        status="active" if is_active else "inactive",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.get("/users/{user_id}", response_model=UserRead)
async def get_user(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    return user


@router.patch("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: uuid.UUID,
    user_in: AdminUserUpdate,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    update_data = user_in.model_dump(exclude_unset=True)
    if "email" in update_data and update_data["email"] != user.email:
        existing = await session.execute(select(User).where(User.email == update_data["email"]))
        if existing.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="EMAIL_ALREADY_EXISTS",
            )

    password = update_data.pop("password", None)
    if password:
        password_helper = PasswordHelper()
        user.hashed_password = password_helper.hash(password)

    if "is_admin" in update_data:
        user.is_admin = bool(update_data["is_admin"])
        user.is_superuser = user.is_admin
        user.role = "admin" if user.is_admin else "user"

    if "status" in update_data:
        user.status = update_data["status"] or user.status
        if user.status == "inactive":
            user.is_active = False
        elif "is_active" not in update_data:
            user.is_active = True

    if "is_active" in update_data:
        user.is_active = bool(update_data["is_active"])
        user.status = "active" if user.is_active else "inactive"

    for field in ("email", "first_name", "last_name"):
        if field in update_data:
            setattr(user, field, update_data[field])

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.post("/users/{user_id}/activate", response_model=UserRead)
async def activate_user(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
):
    return await update_user(
        user_id,
        AdminUserUpdate(is_active=True, status="active"),
        session,
    )


@router.post("/users/{user_id}/deactivate", response_model=UserRead)
async def deactivate_user(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
):
    return await update_user(
        user_id,
        AdminUserUpdate(is_active=False, status="inactive"),
        session,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    await session.execute(
        update(Item).where(Item.owner_user_id == user_id).values(owner_user_id=None)
    )
    await session.execute(
        update(Vendor).where(Vendor.owner_user_id == user_id).values(owner_user_id=None)
    )
    await session.execute(
        update(StockCountSession)
        .where(StockCountSession.created_by_user_id == user_id)
        .values(created_by_user_id=None)
    )
    await session.execute(
        update(StockCountSession)
        .where(StockCountSession.completed_by_user_id == user_id)
        .values(completed_by_user_id=None)
    )
    await session.execute(
        update(SalesOrder)
        .where(SalesOrder.created_by_user_id == user_id)
        .values(created_by_user_id=None)
    )
    await session.delete(user)
    await session.commit()


@router.get("/users/{user_id}/data", response_model=AdminUserDataRead)
async def get_user_data(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    items_result = await session.execute(
        select(Item).where(Item.owner_user_id == user_id).order_by(Item.created_at.desc())
    )
    vendors_result = await session.execute(
        select(Vendor).where(Vendor.owner_user_id == user_id).order_by(Vendor.created_at.desc())
    )

    return AdminUserDataRead(
        user=UserRead.model_validate(user),
        items=[ItemRead.model_validate(item) for item in items_result.scalars().all()],
        vendors=[VendorRead.model_validate(vendor) for vendor in vendors_result.scalars().all()],
        stock_count_sessions=await get_all_sessions_with_relations(
            session,
            created_by_user_id=user_id,
        ),
        sales_orders=await get_all_sales_orders(
            session,
            created_by_user_id=user_id,
        ),
    )

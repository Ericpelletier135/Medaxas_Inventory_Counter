import uuid
from typing import Optional

from fastapi_users import schemas
from pydantic import BaseModel

from app.schemas.item import ItemRead
from app.schemas.sales_order import SalesOrderRead
from app.schemas.stock_count import StockCountSessionRead
from app.schemas.vendor import VendorRead


class UserRead(schemas.BaseUser[uuid.UUID]):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_admin: bool = False
    role: str = "user"
    status: str = "active"


class UserCreate(schemas.BaseUserCreate):
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserUpdate(schemas.BaseUserUpdate):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_admin: Optional[bool] = None
    role: Optional[str] = None
    status: Optional[str] = None


class AdminUserCreate(schemas.BaseUserCreate):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_admin: bool = False
    status: str = "active"
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None


class AdminUserDataRead(BaseModel):
    user: UserRead
    items: list[ItemRead]
    vendors: list[VendorRead]
    stock_count_sessions: list[StockCountSessionRead]
    sales_orders: list[SalesOrderRead]

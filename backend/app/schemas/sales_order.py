from datetime import date, datetime
from typing import List, Optional
import uuid

from pydantic import BaseModel, ConfigDict
from app.schemas.stock_count import ItemMinimal

# --- Sales Order Line ---
class SalesOrderLineBase(BaseModel):
    notes: Optional[str] = None


class SalesOrderLineRead(SalesOrderLineBase):
    sales_order_line_id: uuid.UUID
    sales_order_id: uuid.UUID
    item_id: uuid.UUID
    current_quantity: int
    minimum_quantity: int
    quantity_to_order: int
    unit_of_measure: Optional[str] = None
    item: Optional[ItemMinimal] = None

    model_config = ConfigDict(from_attributes=True)


# --- Sales Order ---
class SalesOrderBase(BaseModel):
    notes: Optional[str] = None


class SalesOrderRead(SalesOrderBase):
    sales_order_id: uuid.UUID
    vendor_id: Optional[uuid.UUID]
    stock_count_session_id: Optional[uuid.UUID]
    created_by_user_id: uuid.UUID
    status: str
    order_number: str
    order_date: date
    total_items: int
    created_at: datetime
    sales_order_lines: List[SalesOrderLineRead] = []

    model_config = ConfigDict(from_attributes=True)

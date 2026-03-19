from datetime import date, datetime
from typing import List, Optional
import uuid

from pydantic import BaseModel, ConfigDict


class ItemMinimal(BaseModel):
    id: uuid.UUID
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    unit_of_measure: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StockCountLineBase(BaseModel):
    notes: Optional[str] = None


class StockCountLineCreate(StockCountLineBase):
    item_id: uuid.UUID
    previous_quantity: int


class StockCountLineUpdate(StockCountLineBase):
    counted_quantity: int
    # Note: variance is computed server-side, not accepted from client


class StockCountLineRead(StockCountLineBase):
    stock_count_line_id: uuid.UUID
    stock_count_session_id: uuid.UUID
    item_id: uuid.UUID
    previous_quantity: int
    counted_quantity: Optional[int]
    variance: Optional[int]
    item: Optional[ItemMinimal] = None  # Included so the UI can display what the item is

    model_config = ConfigDict(from_attributes=True)


# --- Stock Count Session ---
class StockCountSessionBase(BaseModel):
    count_date: Optional[date] = None
    notes: Optional[str] = None


class StockCountSessionCreate(StockCountSessionBase):
    pass


class StockCountSessionRead(StockCountSessionBase):
    stock_count_session_id: uuid.UUID
    status: str
    created_by_user_id: uuid.UUID
    completed_by_user_id: Optional[uuid.UUID]
    created_at: datetime
    completed_at: Optional[datetime]
    stock_count_lines: List[StockCountLineRead] = []

    model_config = ConfigDict(from_attributes=True)

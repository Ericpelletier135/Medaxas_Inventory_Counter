import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ItemBase(BaseModel):
    name: str = Field(..., max_length=255)
    sku: Optional[str] = Field(default=None, max_length=100)
    unit_of_measure: Optional[str] = Field(default=None, max_length=50)
    current_quantity: int = 0
    minimum_quantity: int = 0
    reorder_quantity: int = 0
    status: str = Field(default="active", max_length=20)
    vendor_id: Optional[uuid.UUID] = None
    barcode: Optional[str] = Field(default=None, max_length=255)


class ItemCreate(ItemBase):
    pass


class ItemRead(ItemBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    sku: Optional[str] = Field(default=None, max_length=100)
    unit_of_measure: Optional[str] = Field(default=None, max_length=50)
    current_quantity: Optional[int] = None
    minimum_quantity: Optional[int] = None
    reorder_quantity: Optional[int] = None
    status: Optional[str] = Field(default=None, max_length=20)
    vendor_id: Optional[uuid.UUID] = None
    barcode: Optional[str] = Field(default=None, max_length=255)


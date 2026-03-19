import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class VendorBase(BaseModel):
    vendor_name: str = Field(..., max_length=255)
    contact_name: Optional[str] = Field(default=None, max_length=255)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(default=None, max_length=50)
    address: Optional[str] = None
    status: str = Field(default="active", max_length=20)


class VendorCreate(VendorBase):
    pass


class VendorRead(VendorBase):
    vendor_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VendorUpdate(BaseModel):
    vendor_name: Optional[str] = Field(default=None, max_length=255)
    contact_name: Optional[str] = Field(default=None, max_length=255)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(default=None, max_length=50)
    address: Optional[str] = None
    status: Optional[str] = Field(default=None, max_length=20)


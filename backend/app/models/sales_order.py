import uuid
from datetime import date, datetime, timezone

from sqlalchemy import String, Integer, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    sales_order_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    order_number: Mapped[str | None] = mapped_column(String(100), unique=True)
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("vendors.vendor_id")
    )
    stock_count_session_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stock_count_sessions.stock_count_session_id")
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id")
    )
    order_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    total_items: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    vendor = relationship("Vendor", back_populates="sales_orders")
    stock_count_session = relationship("StockCountSession", back_populates="sales_orders")
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    sales_order_lines = relationship("SalesOrderLine", back_populates="sales_order")

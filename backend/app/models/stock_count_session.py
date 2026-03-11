import uuid
from datetime import date, datetime, timezone

from sqlalchemy import String, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StockCountSession(Base):
    __tablename__ = "stock_count_sessions"

    stock_count_session_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    count_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="open")
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id")
    )
    completed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)

    # Relationships
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    completed_by_user = relationship("User", foreign_keys=[completed_by_user_id])
    stock_count_lines = relationship("StockCountLine", back_populates="stock_count_session")
    sales_orders = relationship("SalesOrder", back_populates="stock_count_session")

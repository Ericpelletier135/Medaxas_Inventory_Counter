import uuid

from sqlalchemy import Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StockCountLine(Base):
    __tablename__ = "stock_count_lines"

    stock_count_line_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    stock_count_session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stock_count_sessions.stock_count_session_id"), nullable=False
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id"), nullable=False
    )
    previous_quantity: Mapped[int] = mapped_column(Integer, default=0)
    counted_quantity: Mapped[int] = mapped_column(Integer, default=0)
    variance: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text)

    # Relationships
    stock_count_session = relationship("StockCountSession", back_populates="stock_count_lines")
    item = relationship("Item", back_populates="stock_count_lines")

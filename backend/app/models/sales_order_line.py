import uuid

from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SalesOrderLine(Base):
    __tablename__ = "sales_order_lines"

    sales_order_line_id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    sales_order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales_orders.sales_order_id"), nullable=False
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("items.id"), nullable=False
    )
    current_quantity: Mapped[int] = mapped_column(Integer, default=0)
    minimum_quantity: Mapped[int] = mapped_column(Integer, default=0)
    quantity_to_order: Mapped[int] = mapped_column(Integer, default=0)
    unit_of_measure: Mapped[str | None] = mapped_column(String(50))
    notes: Mapped[str | None] = mapped_column(Text)

    # Relationships
    sales_order = relationship("SalesOrder", back_populates="sales_order_lines")
    item = relationship("Item", back_populates="sales_order_lines")

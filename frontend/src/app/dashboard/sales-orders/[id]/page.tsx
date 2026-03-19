"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";

type SalesOrderLine = {
  sales_order_line_id: string;
  current_quantity: number;
  minimum_quantity: number;
  quantity_to_order: number;
  unit_of_measure: string | null;
  item: {
    name: string;
    sku: string | null;
  };
};

type SalesOrder = {
  sales_order_id: string;
  order_number: string;
  status: string;
  order_date: string;
  sales_order_lines: SalesOrderLine[];
};

export default function SalesOrderDetailPage() {
  const { id } = useParams() as { id: string };
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      const res = await fetchWithAuth(`/api/sales-orders/${id}`);
      if (res.ok) {
        setOrder(await res.json());
      }
      setLoading(false);
    }
    loadOrder();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!order) return <div>Order not found.</div>;

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ color: "var(--primary)", marginBottom: "0.5rem" }}>
          {order.order_number} <span className={`badge badge-${order.status}`} style={{ marginLeft: "1rem" }}>{order.status}</span>
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Date: {order.order_date} | Lines: {order.sales_order_lines.length}
        </p>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Item / SKU</th>
              <th>Current Qty</th>
              <th>Minimum Threshold</th>
              <th>Order Qty</th>
              <th>UOM</th>
            </tr>
          </thead>
          <tbody>
            {order.sales_order_lines.map((line) => (
              <tr key={line.sales_order_line_id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{line.item.name}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{line.item.sku || "N/A"}</div>
                </td>
                <td style={{ color: "var(--danger)" }}>{line.current_quantity}</td>
                <td style={{ color: "var(--text-secondary)" }}>{line.minimum_quantity}</td>
                <td style={{ fontWeight: 600, color: "var(--primary)" }}>{line.quantity_to_order}</td>
                <td>{line.unit_of_measure || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

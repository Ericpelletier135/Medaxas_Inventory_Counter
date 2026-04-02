"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import Link from "next/link";

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

  if (loading) return <div className="text-secondary">Loading...</div>;
  if (!order) return <div className="text-danger">Order not found.</div>;

  return (
    <div className="flex-col w-full">
      
      <div className="mb-4">
        <Link href="/dashboard/sales-orders" className="btn-secondary">
          Back to Sales Orders
        </Link>
      </div>

      <div className="dashboard-header mb-8">
        <div className="dashboard-header-titles">
          <h1 className="flex-row items-center gap-4">
            {order.order_number} <span className={`badge badge-${order.status}`}>{order.status}</span>
          </h1>
          <p>
            Date: {order.order_date} | Lines: {order.sales_order_lines.length}
          </p>
        </div>
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
                  <div className="text-secondary" style={{ fontSize: "0.85rem" }}>{line.item.sku || "N/A"}</div>
                </td>
                <td className="text-danger">{line.current_quantity}</td>
                <td className="text-secondary">{line.minimum_quantity}</td>
                <td className="text-primary" style={{ fontWeight: 600 }}>{line.quantity_to_order}</td>
                <td>{line.unit_of_measure || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

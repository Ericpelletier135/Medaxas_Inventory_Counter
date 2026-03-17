"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import Link from "next/link";

type SalesOrder = {
  sales_order_id: string;
  order_number: string;
  order_date: string;
  status: string;
  total_items: number;
  created_at: string;
};

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      const res = await fetchWithAuth("/api/sales-orders");
      if (res.ok) {
        setOrders(await res.json());
      }
      setLoading(false);
    }
    loadOrders();
  }, []);

  const getStatusBadgeClass = (status: string) => `badge badge-${status}`;

  if (loading) return <div>Loading orders...</div>;

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ color: "var(--primary)" }}>Sales Orders</h1>
        <p style={{ color: "var(--text-secondary)" }}>View generated purchase orders</p>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Date</th>
              <th>Status</th>
              <th>Total Items</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", fontStyle: "italic", color: "var(--text-secondary)" }}>
                  No sales orders generated yet.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.sales_order_id}>
                  <td style={{ fontWeight: 600 }}>{order.order_number}</td>
                  <td>{order.order_date}</td>
                  <td>
                    <span className={getStatusBadgeClass(order.status)}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.total_items} items</td>
                  <td>
                    <Link href={`/dashboard/sales-orders/${order.sales_order_id}`}>
                      <button className="btn-secondary">View Details</button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

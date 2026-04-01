"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import Link from "next/link";
import LoadingView from "@/components/LoadingView";

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
  const [transitionMsg, setTransitionMsg] = useState<string | null>(null);

  useEffect(() => {
    setTransitionMsg(null);
  }, []);

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

  if (loading) return <LoadingView message="Loading Sales Orders..." />;
  if (transitionMsg) return <LoadingView message={transitionMsg} />;

  return (
    <div className="flex-col w-full">
      <div className="dashboard-header mb-8">
        <div className="dashboard-header-titles">
          <h1>Sales Orders</h1>
          <p>View generated purchase orders</p>
        </div>
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
                <td colSpan={5} className="text-center text-secondary" style={{ fontStyle: "italic" }}>
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
                    <Link
                      href={`/dashboard/sales-orders/${order.sales_order_id}`}
                      onClick={() => setTransitionMsg("Loading order details...")}
                    >
                      <button className="btn-secondary btn-sm">View Details</button>
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

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";

type UserDataResponse = {
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    is_admin: boolean;
    is_active: boolean;
    status: string;
  };
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    current_quantity: number;
    status: string;
  }>;
  vendors: Array<{
    vendor_id: string;
    vendor_name: string;
    email: string | null;
    status: string;
  }>;
  stock_count_sessions: Array<{
    stock_count_session_id: string;
    count_date: string | null;
    status: string;
    created_at: string;
  }>;
  sales_orders: Array<{
    sales_order_id: string;
    order_number: string;
    status: string;
    total_items: number;
    order_date: string;
  }>;
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<UserDataResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetchWithAuth(`/api/admin/users/${params.id}/data`);
        if (res.ok) {
          setData(await res.json());
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  if (loading) return <div>Loading user data...</div>;
  if (!data) return <div>User not found.</div>;

  const displayName = `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim() || data.user.email;

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Link href="/admin/users" style={{ color: "var(--primary)" }}>
            ← Back to users
          </Link>
          <h2 style={{ margin: "0.5rem 0 0", color: "var(--primary)" }}>{displayName}</h2>
          <p style={{ margin: "0.35rem 0 0", color: "var(--text-secondary)" }}>
            {data.user.email} · {data.user.is_admin ? "Admin" : "User"} · {data.user.is_active ? "Active" : "Inactive"}
          </p>
        </div>
      </div>

      <div style={styles.summaryGrid}>
        <SummaryCard label="Items" value={data.items.length} />
        <SummaryCard label="Vendors" value={data.vendors.length} />
        <SummaryCard label="Stock Counts" value={data.stock_count_sessions.length} />
        <SummaryCard label="Sales Orders" value={data.sales_orders.length} />
      </div>

      <SectionCard title="Items">
        <SimpleTable
          headers={["Name", "SKU", "Qty", "Status"]}
          rows={data.items.map((item) => [item.name, item.sku || "-", String(item.current_quantity), item.status])}
          emptyMessage="No items for this user."
        />
      </SectionCard>

      <SectionCard title="Vendors">
        <SimpleTable
          headers={["Vendor", "Email", "Status"]}
          rows={data.vendors.map((vendor) => [vendor.vendor_name, vendor.email || "-", vendor.status])}
          emptyMessage="No vendors for this user."
        />
      </SectionCard>

      <SectionCard title="Stock Count Sessions">
        <SimpleTable
          headers={["Date", "Status", "Created"]}
          rows={data.stock_count_sessions.map((session) => [
            session.count_date || "-",
            session.status,
            new Date(session.created_at).toLocaleString(),
          ])}
          emptyMessage="No stock count sessions for this user."
        />
      </SectionCard>

      <SectionCard title="Sales Orders">
        <SimpleTable
          headers={["Order #", "Date", "Status", "Total Items"]}
          rows={data.sales_orders.map((order) => [
            order.order_number,
            order.order_date,
            order.status,
            String(order.total_items),
          ])}
          emptyMessage="No sales orders for this user."
        />
      </SectionCard>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{label}</div>
      <div style={{ marginTop: "0.4rem", fontSize: "2rem", fontWeight: 700, color: "var(--primary)" }}>
        {value}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: string[][];
  emptyMessage: string;
}) {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={{ color: "var(--text-secondary)", textAlign: "center" }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1rem",
  },
};

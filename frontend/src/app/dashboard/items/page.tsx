"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api";

interface Item {
  id: string;
  name: string;
  sku: string | null;
  unit_of_measure: string | null;
  current_quantity: number;
  minimum_quantity: number;
  status: string;
  barcode: string | null;
  vendor_id: string | null;
}

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadItems() {
    const res = await fetchWithAuth("/api/items");
    if (res.ok) {
      const data = await res.json();
      setItems(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetchWithAuth(`/api/items/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        alert("Failed to delete item.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <div style={{ color: "var(--text-secondary)" }}>Loading items…</div>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ color: "var(--primary)" }}>Items</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Manage your inventory catalogue
          </p>
        </div>
        <Link href="/dashboard/items/new" className="btn-primary">
          + New Item
        </Link>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>Min Qty</th>
              <th>Barcode</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    fontStyle: "italic",
                    color: "var(--text-secondary)",
                  }}
                >
                  No items found. Create your first item to get started.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {item.sku ?? "—"}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {item.unit_of_measure ?? "—"}
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          item.current_quantity <= item.minimum_quantity
                            ? "var(--danger)"
                            : "var(--text-primary)",
                      }}
                    >
                      {item.current_quantity}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {item.minimum_quantity}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {item.barcode || "—"}
                  </td>
                  <td>
                    <span className={`badge badge-${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Link
                        href={`/dashboard/items/${item.id}/edit`}
                        className="btn-secondary"
                        style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
                      >
                        Edit
                      </Link>
                      <button
                        className="btn-secondary"
                        style={{
                          fontSize: "0.8rem",
                          padding: "0.35rem 0.75rem",
                          color: "var(--danger)",
                          borderColor: "var(--danger)",
                        }}
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id, item.name)}
                      >
                        {deletingId === item.id ? "…" : "Delete"}
                      </button>
                    </div>
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

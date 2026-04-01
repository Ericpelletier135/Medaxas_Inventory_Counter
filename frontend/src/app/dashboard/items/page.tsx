"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api";
import LoadingView from "@/components/LoadingView";

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
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [transitionMsg, setTransitionMsg] = useState<string | null>(null);

  useEffect(() => {
    setTransitionMsg(null);
  }, []);

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
    return <LoadingView message="Loading items…" />;
  }
  if (transitionMsg) {
    return <LoadingView message={transitionMsg} />;
  }

  return (
    <div className="flex-col w-full">
      <div className="dashboard-header mb-8">
        <div className="dashboard-header-titles">
          <h1>Items</h1>
          <p>Manage your inventory catalogue</p>
        </div>
        <div className="header-actions">
          <Link 
            href="/dashboard/items/import" 
            className="btn-secondary"
            onClick={() => setTransitionMsg("Loading import utility...")}
          >
            Import CSV
          </Link>
          <Link 
            href="/dashboard/items/new" 
            className="btn-primary"
            onClick={() => setTransitionMsg("Preparing item creation form...")}
          >
            + New Item
          </Link>
        </div>
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
                <td colSpan={8} className="text-center text-secondary" style={{ fontStyle: "italic" }}>
                  No items found. Create your first item to get started.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td className="text-secondary" style={{ fontSize: "0.875rem" }}>
                    {item.sku ?? "—"}
                  </td>
                  <td className="text-secondary" style={{ fontSize: "0.875rem" }}>
                    {item.unit_of_measure ?? "—"}
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 600,
                        color: item.current_quantity <= item.minimum_quantity ? "var(--danger)" : "var(--text-primary)",
                      }}
                    >
                      {item.current_quantity}
                    </span>
                  </td>
                  <td className="text-secondary" style={{ fontSize: "0.875rem" }}>
                    {item.minimum_quantity}
                  </td>
                  <td className="text-secondary" style={{ fontSize: "0.875rem" }}>
                    {item.barcode || "—"}
                  </td>
                  <td>
                    <span className={`badge badge-${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex-row gap-2">
                      <Link
                        href={`/dashboard/items/${item.id}/edit`}
                        className="btn-secondary btn-sm"
                        onClick={() => setTransitionMsg("Loading item details for editing...")}
                      >
                        Edit
                      </Link>
                      <button
                        className="btn-secondary btn-sm text-danger"
                        style={{ borderColor: "var(--danger)" }}
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

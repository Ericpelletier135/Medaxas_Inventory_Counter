"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/api";

type ItemStatus = "active" | "inactive";

type Item = {
  id: string;
  name: string;
  sku: string | null;
  unit_of_measure: string | null;
  current_quantity: number;
  minimum_quantity: number;
  reorder_quantity: number;
  status: string;
  vendor_id: string | null;
  barcode: string | null;
};

type Vendor = {
  vendor_id: string;
  vendor_name: string;
  status: string;
};

type ItemFormState = {
  name: string;
  sku: string;
  barcode: string;
  unit_of_measure: string;
  current_quantity: number;
  minimum_quantity: number;
  reorder_quantity: number;
  vendor_id: string;
  status: ItemStatus;
};

const initialForm: ItemFormState = {
  name: "",
  sku: "",
  barcode: "",
  unit_of_measure: "",
  current_quantity: 0,
  minimum_quantity: 0,
  reorder_quantity: 0,
  vendor_id: "",
  status: "active",
};

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemFormState>(initialForm);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ItemStatus>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");

  useEffect(() => {
    async function loadData() {
      try {
        const [itemsRes, vendorsRes] = await Promise.all([
          fetchWithAuth("/api/items"),
          fetchWithAuth("/api/vendors"),
        ]);

        if (itemsRes.ok) {
          setItems((await itemsRes.json()) as Item[]);
        }
        if (vendorsRes.ok) {
          setVendors((await vendorsRes.json()) as Vendor[]);
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const vendorNameById = useMemo(() => {
    const map = new Map<string, string>();
    vendors.forEach((vendor) => map.set(vendor.vendor_id, vendor.vendor_name));
    return map;
  }, [vendors]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const vendorName = item.vendor_id ? (vendorNameById.get(item.vendor_id) || "") : "";
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        (item.sku || "").toLowerCase().includes(normalizedSearch) ||
        (item.barcode || "").toLowerCase().includes(normalizedSearch) ||
        vendorName.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const isLowStock = item.status === "active" && item.current_quantity <= item.minimum_quantity;
      const matchesStock = stockFilter === "all" || isLowStock;

      return matchesSearch && matchesStatus && matchesStock;
    });
  }, [items, searchTerm, statusFilter, stockFilter, vendorNameById]);

  function openEditModal(item: Item) {
    setEditingItemId(item.id);
    setForm({
      name: item.name,
      sku: item.sku || "",
      barcode: item.barcode || "",
      unit_of_measure: item.unit_of_measure || "",
      current_quantity: item.current_quantity,
      minimum_quantity: item.minimum_quantity,
      reorder_quantity: item.reorder_quantity,
      vendor_id: item.vendor_id || "",
      status: item.status === "inactive" ? "inactive" : "active",
    });
    setIsModalOpen(true);
  }

  function openCreateModal() {
    setEditingItemId(null);
    setForm(initialForm);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingItemId(null);
    setForm(initialForm);
  }

  async function handleSaveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      barcode: form.barcode.trim() || null,
      unit_of_measure: form.unit_of_measure.trim() || null,
      current_quantity: Number(form.current_quantity),
      minimum_quantity: Number(form.minimum_quantity),
      reorder_quantity: Number(form.reorder_quantity),
      vendor_id: form.vendor_id || null,
      status: form.status,
    };

    try {
      const endpoint = editingItemId ? `/api/items/${editingItemId}` : "/api/items";
      const method = editingItemId ? "PATCH" : "POST";

      const res = await fetchWithAuth(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        alert(errorBody.detail || "Failed to save item.");
        return;
      }

      const saved = (await res.json()) as Item;
      setItems((prev) => {
        if (editingItemId) {
          return prev.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...prev];
      });
      closeModal();
    } catch {
      alert("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading items...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ color: "var(--primary)" }}>Item Management</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Track inventory levels, vendors, and stock risk.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          Create Item
        </button>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={styles.filterRow}>
          <input
            className="input-field"
            placeholder="Search by name, SKU, barcode, or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: "420px" }}
          />
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value as "all" | ItemStatus) || "all")}
            style={{ maxWidth: "200px" }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            className="input-field"
            value={stockFilter}
            onChange={(e) => setStockFilter((e.target.value as "all" | "low") || "all")}
            style={{ maxWidth: "200px" }}
          >
            <option value="all">All stock levels</option>
            <option value="low">Low stock only</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Barcode</th>
              <th>Current Qty</th>
              <th>Min Qty</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>Stock Alert</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                  No items match your filters.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isLowStock =
                  item.status === "active" && item.current_quantity <= item.minimum_quantity;
                const vendorName = item.vendor_id
                  ? (vendorNameById.get(item.vendor_id) || "Unknown Vendor")
                  : "-";

                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.sku || "-"}</td>
                    <td>{item.barcode || "-"}</td>
                    <td>{item.current_quantity}</td>
                    <td>{item.minimum_quantity}</td>
                    <td>{vendorName}</td>
                    <td>
                      <span className={`badge badge-${item.status === "active" ? "completed" : "cancelled"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {isLowStock ? (
                        <span style={styles.lowStock}>Low Stock</span>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>OK</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="btn-secondary" onClick={() => openEditModal(item)}>
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div className="card" style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: "1rem" }}>{editingItemId ? "Edit Item" : "Create Item"}</h3>
            <form onSubmit={handleSaveItem}>
              <div style={styles.grid}>
                <div>
                  <label style={styles.label}>Name *</label>
                  <input
                    className="input-field"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>SKU</label>
                  <input
                    className="input-field"
                    value={form.sku}
                    onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={styles.label}>Barcode</label>
                  <input
                    className="input-field"
                    value={form.barcode}
                    onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={styles.label}>Unit of Measure</label>
                  <input
                    className="input-field"
                    value={form.unit_of_measure}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, unit_of_measure: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label style={styles.label}>Current Quantity</label>
                  <input
                    className="input-field"
                    type="number"
                    value={form.current_quantity}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, current_quantity: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label style={styles.label}>Minimum Quantity</label>
                  <input
                    className="input-field"
                    type="number"
                    value={form.minimum_quantity}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, minimum_quantity: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label style={styles.label}>Reorder Quantity</label>
                  <input
                    className="input-field"
                    type="number"
                    value={form.reorder_quantity}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, reorder_quantity: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label style={styles.label}>Vendor</label>
                  <select
                    className="input-field"
                    value={form.vendor_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, vendor_id: e.target.value }))}
                  >
                    <option value="">No Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.vendor_id} value={vendor.vendor_id}>
                        {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                </div>
                {editingItemId && (
                  <div>
                    <label style={styles.label}>Status</label>
                    <select
                      className="input-field"
                      value={form.status}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          status: (e.target.value as ItemStatus) || "active",
                        }))
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button className="btn-primary" type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingItemId ? "Save Changes" : "Create Item"}
                </button>
                <button className="btn-secondary" type="button" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  filterRow: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  lowStock: {
    color: "var(--danger)",
    fontWeight: 700,
  },
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modalCard: {
    width: "100%",
    maxWidth: "840px",
    maxHeight: "90vh",
    overflowY: "auto" as const,
  },
  label: {
    display: "block",
    fontSize: "0.85rem",
    color: "var(--text-secondary)",
    marginBottom: "0.35rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "0.9rem",
  },
};

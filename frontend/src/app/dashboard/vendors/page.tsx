"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/api";

type VendorStatus = "active" | "inactive";

type Vendor = {
  vendor_id: string;
  vendor_name: string;
  contact_name: string | null;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type VendorFormState = {
  vendor_name: string;
  contact_name: string;
  email: string;
  phone_number: string;
  address: string;
  status: VendorStatus;
};

const initialForm: VendorFormState = {
  vendor_name: "",
  contact_name: "",
  email: "",
  phone_number: "",
  address: "",
  status: "active",
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VendorStatus>("all");
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [form, setForm] = useState<VendorFormState>(initialForm);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadVendors() {
      try {
        const res = await fetchWithAuth("/api/vendors");
        if (res.ok) {
          const data = (await res.json()) as Vendor[];
          setVendors(data);
        }
      } finally {
        setLoading(false);
      }
    }

    loadVendors();
  }, []);

  const filteredVendors = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return vendors.filter((vendor) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        vendor.vendor_name.toLowerCase().includes(normalizedSearch) ||
        (vendor.contact_name || "").toLowerCase().includes(normalizedSearch) ||
        (vendor.email || "").toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === "all" || vendor.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vendors, searchTerm, statusFilter]);

  function resetForm() {
    setForm(initialForm);
    setEditingVendorId(null);
    setIsModalOpen(false);
  }

  function openCreateModal() {
    setEditingVendorId(null);
    setForm(initialForm);
    setIsModalOpen(true);
  }

  function startEdit(vendor: Vendor) {
    setEditingVendorId(vendor.vendor_id);
    setForm({
      vendor_name: vendor.vendor_name,
      contact_name: vendor.contact_name || "",
      email: vendor.email || "",
      phone_number: vendor.phone_number || "",
      address: vendor.address || "",
      status: vendor.status === "inactive" ? "inactive" : "active",
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      vendor_name: form.vendor_name.trim(),
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim() || null,
      phone_number: form.phone_number.trim() || null,
      address: form.address.trim() || null,
      status: form.status,
    };

    try {
      const endpoint = editingVendorId ? `/api/vendors/${editingVendorId}` : "/api/vendors";
      const method = editingVendorId ? "PATCH" : "POST";

      const res = await fetchWithAuth(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        alert(errorBody.detail || "Failed to save vendor.");
        return;
      }

      const saved = (await res.json()) as Vendor;
      setVendors((prev) => {
        if (editingVendorId) {
          return prev.map((v) => (v.vendor_id === saved.vendor_id ? saved : v));
        }
        return [saved, ...prev];
      });
      resetForm();
    } catch {
      alert("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading vendors...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ color: "var(--primary)" }}>Vendor Management</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Manage suppliers and review each vendor&apos;s items.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          Create Vendor
        </button>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={styles.filterRow}>
          <input
            className="input-field"
            placeholder="Search vendor name, contact, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: "380px" }}
          />
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value as "all" | VendorStatus) || "all")}
            style={{ maxWidth: "200px" }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVendors.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                  No vendors match your filters.
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => (
                <tr key={vendor.vendor_id}>
                  <td>
                    <Link href={`/dashboard/vendors/${vendor.vendor_id}`} style={styles.link}>
                      {vendor.vendor_name}
                    </Link>
                  </td>
                  <td>{vendor.contact_name || "-"}</td>
                  <td>{vendor.email || "-"}</td>
                  <td>{vendor.phone_number || "-"}</td>
                  <td>
                    <span className={`badge badge-${vendor.status === "inactive" ? "cancelled" : "completed"}`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn-secondary" onClick={() => startEdit(vendor)}>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={resetForm}>
          <div className="card" style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: "1rem" }}>
              {editingVendorId ? "Edit Vendor" : "Create Vendor"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.grid}>
                <div>
                  <label style={styles.label}>Vendor Name *</label>
                  <input
                    className="input-field"
                    value={form.vendor_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, vendor_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>Contact Name</label>
                  <input
                    className="input-field"
                    value={form.contact_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={styles.label}>Email</label>
                  <input
                    className="input-field"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={styles.label}>Phone</label>
                  <input
                    className="input-field"
                    value={form.phone_number}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={styles.label}>Address</label>
                  <input
                    className="input-field"
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                {editingVendorId && (
                  <div>
                    <label style={styles.label}>Status</label>
                    <select
                      className="input-field"
                      value={form.status}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          status: (e.target.value as VendorStatus) || "active",
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
                <button className="btn-primary" disabled={saving} type="submit">
                  {saving ? "Saving..." : editingVendorId ? "Save Changes" : "Create Vendor"}
                </button>
                <button className="btn-secondary" type="button" onClick={resetForm}>
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
  filterRow: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  link: {
    color: "var(--primary)",
    fontWeight: 600,
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
    maxWidth: "720px",
    maxHeight: "90vh",
    overflowY: "auto" as const,
  },
};

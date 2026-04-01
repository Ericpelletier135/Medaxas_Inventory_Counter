"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import LoadingView from "@/components/LoadingView";

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

  if (loading) return <LoadingView message="Loading Vendors..." />;

  return (
    <div className="flex-col">
      <div className="dashboard-header mb-8">
        <div className="dashboard-header-titles">
          <h1>Vendor Management</h1>
          <p>Manage suppliers and review each vendor&apos;s items.</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={openCreateModal}>
            + New Vendor
          </button>
        </div>
      </div>

      <div className="card mb-4 p-4">
        <div className="flex-row gap-4 items-center flex-wrap">
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
                <td colSpan={6} className="text-center text-secondary">
                  No vendors match your filters.
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => (
                <tr key={vendor.vendor_id}>
                  <td>
                    <Link href={`/dashboard/vendors/${vendor.vendor_id}`} className="text-primary" style={{ fontWeight: 600 }}>
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
                    <div className="flex-row gap-2">
                      <button className="btn-secondary btn-sm" onClick={() => startEdit(vendor)}>
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
        <div
          className="flex-col items-center justify-center p-4"
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 1000 }}
          onClick={resetForm}
        >
          <div className="card w-full" style={{ maxWidth: "720px", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex-row justify-between items-center mb-4">
              <h3 className="mb-0">
                {editingVendorId ? "Edit Vendor" : "Create Vendor"}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-secondary hover:text-danger"
                style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid cols-2">
                <div className="form-group mb-0">
                  <label className="form-label">Vendor Name *</label>
                  <input
                    className="input-field"
                    value={form.vendor_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, vendor_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Contact Name</label>
                  <input
                    className="input-field"
                    value={form.contact_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Email</label>
                  <input
                    className="input-field"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Phone</label>
                  <input
                    className="input-field"
                    value={form.phone_number}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                  />
                </div>
                <div className="form-group mb-0" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Address</label>
                  <input
                    className="input-field"
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                {editingVendorId && (
                  <div className="form-group mb-0">
                    <label className="form-label">Status</label>
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

              <div className="flex-row gap-3 mt-4">
                <button className="btn-primary flex-row items-center justify-center gap-2" disabled={saving} type="submit">
                  {saving && <span className="spinner" />}
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

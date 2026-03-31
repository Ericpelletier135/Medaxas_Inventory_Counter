"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";

type UserRecord = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  status: string;
};

type UserFormState = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  is_active: boolean;
  status: "active" | "inactive";
};

const initialForm: UserFormState = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  is_admin: false,
  is_active: true,
  status: "active",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<UserFormState>(initialForm);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const res = await fetchWithAuth("/api/admin/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingUser(null);
    setForm(initialForm);
    setIsModalOpen(true);
  }

  function openEditModal(user: UserRecord) {
    setEditingUser(user);
    setForm({
      email: user.email,
      password: "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      is_admin: user.is_admin,
      is_active: user.is_active,
      status: user.status === "inactive" ? "inactive" : "active",
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingUser(null);
    setForm(initialForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const endpoint = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
      const method = editingUser ? "PATCH" : "POST";
      const payload = {
        email: form.email.trim(),
        password: form.password || undefined,
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        is_admin: form.is_admin,
        is_active: form.status === "active",
        status: form.status,
      };

      const res = await fetchWithAuth(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to save user.");
        return;
      }

      const saved = (await res.json()) as UserRecord;
      setUsers((prev) => {
        if (editingUser) {
          return prev.map((user) => (user.id === saved.id ? saved : user));
        }
        return [saved, ...prev];
      });
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user: UserRecord) {
    if (!confirm(`Delete ${user.email}?`)) return;
    const res = await fetchWithAuth(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Failed to delete user.");
      return;
    }
    setUsers((prev) => prev.filter((entry) => entry.id !== user.id));
  }

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--primary)" }}>Users</h2>
          <p style={{ margin: "0.4rem 0 0", color: "var(--text-secondary)" }}>
            Create, edit, and inspect user accounts.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateModal}>
          Create User
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={{ fontWeight: 500 }}>{`${user.first_name || ""} ${user.last_name || ""}`.trim() || "-"}</td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{user.email}</td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  {user.is_admin ? "Admin" : "User"}
                </td>
                <td>
                  <span className={`badge badge-${user.is_active ? "completed" : "cancelled"}`}>
                    {user.is_active ? "active" : "inactive"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="btn-secondary"
                      style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
                    >
                      View Data
                    </Link>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
                      onClick={() => openEditModal(user)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{
                        fontSize: "0.8rem",
                        padding: "0.35rem 0.75rem",
                        color: "var(--danger)",
                        borderColor: "var(--danger)",
                      }}
                      onClick={() => deleteUser(user)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div className="card" style={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingUser ? "Edit User" : "Create User"}</h3>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.9rem" }}>
              <div style={styles.grid}>
                <FormField label="Email">
                  <input
                    className="input-field"
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </FormField>
                <FormField label={editingUser ? "Password (leave blank to keep)" : "Password"}>
                  <input
                    className="input-field"
                    type="password"
                    required={!editingUser}
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  />
                </FormField>
                <FormField label="First Name">
                  <input
                    className="input-field"
                    value={form.first_name}
                    onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
                  />
                </FormField>
                <FormField label="Last Name">
                  <input
                    className="input-field"
                    value={form.last_name}
                    onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
                  />
                </FormField>
                <FormField label="Status">
                  <select
                    className="input-field"
                    value={form.status}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        status: event.target.value as "active" | "inactive",
                        is_active: event.target.value === "active",
                      }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </FormField>
                <FormField label="Admin">
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", minHeight: 42 }}>
                    <input
                      type="checkbox"
                      checked={form.is_admin}
                      onChange={(event) => setForm((prev) => ({ ...prev, is_admin: event.target.checked }))}
                    />
                    Grant admin access
                  </label>
                </FormField>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
                </button>
                <button type="button" className="btn-secondary" onClick={closeModal}>
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

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "0.9rem",
  },
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 1000,
  },
  modalCard: {
    width: "100%",
    maxWidth: "720px",
    maxHeight: "90vh",
    overflowY: "auto" as const,
  },
};

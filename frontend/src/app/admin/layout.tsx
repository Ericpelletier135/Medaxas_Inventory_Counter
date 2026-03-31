"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuthTokens, fetchCurrentUser } from "@/lib/api";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetchCurrentUser()
      .then((user) => {
        if (!user) {
          router.replace("/login");
          return;
        }
        if (!user.is_admin) {
          router.replace("/dashboard");
          return;
        }
        setChecked(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  function handleLogout() {
    clearAuthTokens();
    window.location.href = "/login";
  }

  if (!checked) {
    return <div style={{ padding: "2rem" }}>Loading admin console...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: "var(--primary)", fontSize: "1.25rem" }}>Admin Console</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Manage users and review account-level inventory data.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/admin/users" className="btn-secondary">
            Users
          </Link>
          <button type="button" className="btn-primary" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main style={{ padding: "2rem" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>{children}</div>
      </main>
    </div>
  );
}

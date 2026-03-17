"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Session = {
  stock_count_session_id: string;
  count_date: string;
  status: str;
  created_at: string;
  stock_count_lines: any[];
};

export default function StockCountsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadSessions() {
      const res = await fetchWithAuth("/api/stock-count-sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
      setLoading(false);
    }
    loadSessions();
  }, []);

  async function handleCreateSession() {
    setCreating(true);
    try {
      const res = await fetchWithAuth("/api/stock-count-sessions", {
        method: "POST",
        body: JSON.stringify({ count_date: new Date().toISOString().split("T")[0] }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/stock-counts/${data.stock_count_session_id}`);
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to create session.");
      }
    } catch (e) {
      alert("Network error.");
    } finally {
      setCreating(false);
    }
  }

  const getStatusBadgeClass = (status: string) => `badge badge-${status}`;

  if (loading) return <div>Loading sessions...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ color: "var(--primary)" }}>Stock Counts</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage inventory count sessions</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={handleCreateSession} 
          disabled={creating}
        >
          {creating ? "Creating..." : "New Count Session"}
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Items</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", fontStyle: "italic", color: "var(--text-secondary)" }}>
                  No count sessions found.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.stock_count_session_id}>
                  <td>{session.count_date}</td>
                  <td>
                    <span className={getStatusBadgeClass(session.status)}>
                      {session.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>{session.stock_count_lines.length} items</td>
                  <td>{new Date(session.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/dashboard/stock-counts/${session.stock_count_session_id}`}>
                      <button className="btn-secondary">
                        {session.status === "completed" ? "View" : "Continue"}
                      </button>
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

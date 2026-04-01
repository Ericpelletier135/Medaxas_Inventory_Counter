"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoadingView from "@/components/LoadingView";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Session = {
  stock_count_session_id: string;
  count_date: string;
  status: string;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stock_count_lines: any[];
};

export default function StockCountsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [transitionMsg, setTransitionMsg] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setTransitionMsg(null);
  }, []);

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
        const targetUrl = `/dashboard/stock-counts/${data.stock_count_session_id}`;
        setTransitionMsg("Initializing session space...");
        router.push(targetUrl);
        return; // Early return prevents setCreating(false) from turning off spinner before transition
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

  if (loading) return <LoadingView message="Loading Stock Counts..." />;
  if (transitionMsg) return <LoadingView message={transitionMsg} />;

  return (
    <div className="flex-col w-full">
      <div className="dashboard-header mb-8">
        <div className="dashboard-header-titles">
          <h1>Stock Counts</h1>
          <p>Manage inventory count sessions</p>
        </div>
        <div className="header-actions">
          <button
            className="btn-primary flex-row items-center justify-center gap-2"
            onClick={handleCreateSession}
            disabled={creating}
          >
            {creating && <span className="spinner" />}
            {creating ? "Creating..." : "+ New Count Session"}
          </button>
        </div>
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
                <td colSpan={5} className="text-center text-secondary" style={{ fontStyle: "italic" }}>
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
                    <Link
                      href={`/dashboard/stock-counts/${session.stock_count_session_id}`}
                      onClick={() => setTransitionMsg(session.status === "completed" ? "Loading session details..." : "Entering count session...")}
                    >
                      <button className="btn-secondary btn-sm">
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

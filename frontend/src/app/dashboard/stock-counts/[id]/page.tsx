"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";

type ItemMinimal = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit_of_measure: string | null;
};

type StockCountLine = {
  stock_count_line_id: string;
  item_id: string;
  previous_quantity: number;
  counted_quantity: number | null;
  variance: number | null;
  notes: string | null;
  item: ItemMinimal;
};

type StockCountSession = {
  stock_count_session_id: string;
  status: string;
  count_date: string;
  stock_count_lines: StockCountLine[];
};

export default function StockCountDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [session, setSession] = useState<StockCountSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [localCounts, setLocalCounts] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadSession() {
      const res = await fetchWithAuth(`/api/stock-count-sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data);

        const initialCounts: Record<string, string> = {};
        data.stock_count_lines.forEach((line: StockCountLine) => {
          initialCounts[line.stock_count_line_id] = line.counted_quantity !== null ? String(line.counted_quantity) : "";
        });
        setLocalCounts(initialCounts);
      }
      setLoading(false);
    }
    loadSession();
  }, [id]);

  const handleCountChange = (lineId: string, value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    setLocalCounts((prev) => ({ ...prev, [lineId]: value }));
  };

  const handleBlurSave = async (lineId: string) => {
    if (!session) return;
    const value = localCounts[lineId];
    if (value === "") return;

    const numValue = parseInt(value, 10);

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stock_count_lines: prev.stock_count_lines.map(line =>
          line.stock_count_line_id === lineId
            ? { ...line, counted_quantity: numValue, variance: numValue - line.previous_quantity }
            : line
        )
      };
    });

    try {
      await fetchWithAuth(`/api/stock-count-sessions/${id}/lines/${lineId}`, {
        method: "PATCH",
        body: JSON.stringify({ counted_quantity: numValue })
      });
    } catch {
      alert("Failed to save count. Check connection.");
    }
  };

  const handleComplete = async () => {
    if (!confirm("Are you sure? This will update the live inventory quantities.")) return;

    setCompleting(true);
    try {
      const res = await fetchWithAuth(`/api/stock-count-sessions/${id}/complete`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data);
        alert("Session completed successfully!");
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to complete.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setCompleting(false);
    }
  };

  const handleGenerateOrders = async () => {
    setGenerating(true);
    try {
      const res = await fetchWithAuth(`/api/sales-orders/generate/${id}`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.length === 0) {
          alert("All items are above minimum stock levels. No orders needed.");
        } else {
          alert(`Generated ${data.length} sales orders successfully.`);
          router.push("/dashboard/sales-orders");
        }
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to generate orders.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!session) return <div>Session not found.</div>;

  const totalLines = session.stock_count_lines.length;
  const completedLines = session.stock_count_lines.filter(l => l.counted_quantity !== null).length;
  const progressPercent = totalLines === 0 ? 100 : Math.round((completedLines / totalLines) * 100);

  const isCompleted = session.status === "completed";
  const canComplete = completedLines === totalLines && !isCompleted && totalLines > 0;

  return (
    <div className="flex-col w-full">
      <div className="dashboard-header mb-8">
        <div className="dashboard-header-titles">
          <h1 className="flex-row items-center gap-4">
            Count Session <span className={`badge badge-${session.status}`}>{session.status.replace("_", " ")}</span>
          </h1>
          <p>
            Date: {session.count_date} | Items: {totalLines}
          </p>
        </div>

        <div className="header-actions">
          {!isCompleted ? (
            <button
              className="btn-primary flex-row items-center justify-center gap-2"
              onClick={handleComplete}
              disabled={!canComplete || completing}
              title={!canComplete ? "You must count all items before completing." : ""}
              style={{ backgroundColor: canComplete ? "var(--success)" : "var(--border)", color: canComplete ? "white" : "var(--text-secondary)" }}
            >
              {completing && <span className="spinner" />}
              {completing ? "Completing..." : "Complete Session"}
            </button>
          ) : (
            <button
              className="btn-primary flex-row items-center justify-center gap-2"
              onClick={handleGenerateOrders}
              disabled={generating}
            >
              {generating && <span className="spinner" />}
              {generating ? "Generating..." : "Generate Sales Orders"}
            </button>
          )}
        </div>
      </div>

      {!isCompleted && (
        <div className="card mb-8">
          <div className="flex-row justify-between mb-2">
            <span style={{ fontWeight: 500 }}>Counting Progress</span>
            <span className="text-secondary">{completedLines} / {totalLines} items</span>
          </div>
          <div style={{ width: "100%", height: "12px", backgroundColor: "var(--border)", borderRadius: "9999px", overflow: "hidden" }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                backgroundColor: progressPercent === 100 ? "var(--success)" : "var(--primary)",
                transition: "width 0.3s ease, background-color 0.3s ease"
              }}
            />
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Item / SKU</th>
              <th>System Qty</th>
              <th>Physical Count</th>
              <th>Variance</th>
            </tr>
          </thead>
          <tbody>
            {session.stock_count_lines.map((line) => {
              const varianceValue = line.variance;
              let varianceStyle = { color: "var(--text-primary)" };
              if (varianceValue !== null) {
                if (varianceValue < 0) varianceStyle.color = "var(--danger)";
                if (varianceValue > 0) varianceStyle.color = "var(--success)";
              }

              return (
                <tr key={line.stock_count_line_id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{line.item.name}</div>
                    <div className="text-secondary" style={{ fontSize: "0.85rem" }}>{line.item.sku || line.item.barcode || "N/A"}</div>
                  </td>
                  <td>{line.previous_quantity}</td>
                  <td>
                    <input
                      type="text"
                      className="input-field"
                      style={{ width: "100%", maxWidth: "100px", textAlign: "right", backgroundColor: isCompleted ? "#f9fafb" : "white" }}
                      value={localCounts[line.stock_count_line_id] ?? ""}
                      onChange={(e) => handleCountChange(line.stock_count_line_id, e.target.value)}
                      onBlur={() => handleBlurSave(line.stock_count_line_id)}
                      disabled={isCompleted}
                      placeholder="-"
                    />
                  </td>
                  <td style={varianceStyle}>
                    {varianceValue !== null ? (varianceValue > 0 ? `+${varianceValue}` : varianceValue) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

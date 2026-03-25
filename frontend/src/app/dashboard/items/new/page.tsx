"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ItemForm, { type ItemFormValues } from "@/components/ItemForm";
import { fetchWithAuth } from "@/lib/api";

export default function CreateItemPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  async function handleSubmit(data: Omit<ItemFormValues, "no_barcode">) {
    setApiError(null);
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth("/api/items", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          vendor_id: data.vendor_id || null,
          barcode: data.barcode || null,
          sku: data.sku || null,
          unit_of_measure: data.unit_of_measure || null,
        }),
      });

      if (res.ok) {
        router.push("/dashboard/items");
        return;
      }

      const err = await res.json().catch(() => ({}));
      if (err.detail === "SKU_ALREADY_EXISTS") {
        setApiError("An item with this SKU already exists. Please use a unique SKU.");
      } else {
        setApiError(err.detail || "Failed to create item. Please try again.");
      }
    } catch {
      setApiError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ color: "var(--primary)" }}>Create New Item</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Fill in the details manually, or upload a product photo to auto-fill.
        </p>
      </div>

      <div className="card">
        {apiError && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "var(--radius-md)",
              padding: "0.75rem 1rem",
              color: "var(--danger)",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
            }}
          >
            {apiError}
          </div>
        )}
        <ItemForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Create Item"
        />
      </div>
    </div>
  );
}

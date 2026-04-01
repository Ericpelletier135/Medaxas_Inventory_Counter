"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ItemFormValues } from "@/components/ItemForm";
import dynamic from "next/dynamic";
import { fetchWithAuth } from "@/lib/api";
import LoadingView from "@/components/LoadingView";

const ItemForm = dynamic(() => import("@/components/ItemForm"), {
  loading: () => <LoadingView message="Initializing form utilities..." />
});

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
    <div className="flex-col w-full">
      <div className="dashboard-header mb-8">
        <div className="dashboard-header-titles">
          <Link href="/dashboard/items" className="text-secondary mb-2 inline-block hover:text-primary" style={{ fontSize: "0.9rem", fontWeight: 500, textDecoration: "none" }}>
            ← Back to Items
          </Link>
          <h1>Create New Item</h1>
          <p>Fill in the details manually, or upload a product photo to auto-fill.</p>
        </div>
      </div>

      <div className="card w-full">
        {apiError && (
          <div className="form-error mb-6 p-3" style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "var(--radius-md)" }}>
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

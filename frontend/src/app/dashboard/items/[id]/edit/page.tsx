"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import ItemForm, { type ItemFormValues } from "@/components/ItemForm";
import { fetchWithAuth } from "@/lib/api";

interface ItemRead {
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
}

export default function EditItemPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const itemId = params.id;

  const [initialValues, setInitialValues] = useState<Partial<ItemFormValues> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) return;
    fetchWithAuth(`/api/items/${itemId}`)
      .then(async (res) => {
        if (!res.ok) {
          setLoadError("Item not found.");
          return;
        }
        const item: ItemRead = await res.json();
        setInitialValues({
          name: item.name,
          sku: item.sku ?? "",
          unit_of_measure: item.unit_of_measure ?? "",
          current_quantity: item.current_quantity,
          minimum_quantity: item.minimum_quantity,
          reorder_quantity: item.reorder_quantity,
          status: (item.status as "active" | "inactive") ?? "active",
          vendor_id: item.vendor_id ?? "",
          barcode: item.barcode ?? "",
          no_barcode: !item.barcode,
        });
      })
      .catch(() => setLoadError("Failed to load item."));
  }, [itemId]);

  async function handleSubmit(data: Omit<ItemFormValues, "no_barcode">) {
    setApiError(null);
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`/api/items/${itemId}`, {
        method: "PATCH",
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
        setApiError("An item with this SKU already exists.");
      } else if (err.detail === "ITEM_NOT_FOUND") {
        setApiError("This item no longer exists.");
      } else {
        setApiError(err.detail || "Failed to update item. Please try again.");
      }
    } catch {
      setApiError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div>
        <h1 style={{ color: "var(--danger)" }}>Error</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>{loadError}</p>
        <a href="/dashboard/items" className="btn-secondary" style={{ marginTop: "1rem", display: "inline-block" }}>
          ← Back to Items
        </a>
      </div>
    );
  }

  if (!initialValues) {
    return <div style={{ color: "var(--text-secondary)" }}>Loading item…</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ color: "var(--primary)" }}>Edit Item</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Update item details, or use the photo scanner to re-fill fields.
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
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}

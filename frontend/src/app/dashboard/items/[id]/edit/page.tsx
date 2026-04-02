"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type { ItemFormValues } from "@/components/ItemForm";
import dynamic from "next/dynamic";
import { fetchWithAuth } from "@/lib/api";
import LoadingView from "@/components/LoadingView";

const ItemForm = dynamic(() => import("@/components/ItemForm"), {
  loading: () => <LoadingView message="Initializing form utilities..." />
});

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

  const [initialValues, setInitialValues] = useState<Partial<ItemFormValues> | undefined>(undefined);
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
      <div className="flex-col">
        <h1 className="text-danger">Error</h1>
        <p className="text-secondary mt-2">{loadError}</p>
        <div className="mt-4">
          <Link href="/dashboard/items" className="btn-secondary">
            ← Back to Items
          </Link>
        </div>
      </div>
    );
  }

  if (!initialValues) {
    return <LoadingView message="Loading item details..." />;
  }

  return (
    <div className="flex-col w-full">
      <div className="dashboard-header mb-8">
        <div className="dashboard-header-titles">
          <h1>Edit Item</h1>
          <p>Update item details, or use the photo scanner to re-fill fields.</p>
        </div>
      </div>

      <div className="card w-full">
        {apiError && (
          <div className="form-error mb-6 p-3" style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "var(--radius-md)" }}>
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

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";

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

type Item = {
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
};

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();
  const vendorId = params.id;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVendorDetails() {
      try {
        const [vendorRes, itemsRes] = await Promise.all([
          fetchWithAuth(`/api/vendors/${vendorId}`),
          fetchWithAuth("/api/items"),
        ]);

        if (!vendorRes.ok) {
          setError("Vendor not found.");
          setLoading(false);
          return;
        }
        if (!itemsRes.ok) {
          setError("Failed to load vendor items.");
          setLoading(false);
          return;
        }

        const [vendorData, itemsData] = (await Promise.all([
          vendorRes.json(),
          itemsRes.json(),
        ])) as [Vendor, Item[]];

        setVendor(vendorData);
        setItems(itemsData);
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    }

    if (vendorId) {
      loadVendorDetails();
    }
  }, [vendorId]);

  const vendorItems = useMemo(
    () => items.filter((item) => item.vendor_id === vendorId),
    [items, vendorId],
  );

  if (loading) return <div>Loading vendor details...</div>;
  if (error) return <div>{error}</div>;
  if (!vendor) return <div>Vendor not found.</div>;

  return (
    <div className="flex-col">
      <div className="mb-4">
        <Link href="/dashboard/vendors" className="btn-secondary">
          Back to Vendors
        </Link>
      </div>

      <div className="card mb-6">
        <h1 className="text-primary mb-2">{vendor.vendor_name}</h1>
        <p className="text-secondary mb-4">
          Supplier details and linked inventory items.
        </p>
        <div className="form-grid cols-2">
          <div>
            <strong>Contact:</strong> {vendor.contact_name || "-"}
          </div>
          <div>
            <strong>Email:</strong> {vendor.email || "-"}
          </div>
          <div>
            <strong>Phone:</strong> {vendor.phone_number || "-"}
          </div>
          <div>
            <strong>Status:</strong>{" "}
            <span className={`badge badge-${vendor.status === "inactive" ? "cancelled" : "completed"}`}>
              {vendor.status}
            </span>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <strong>Address:</strong> {vendor.address || "-"}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3">
          <h2>Items Supplied</h2>
          <p className="text-secondary">
            {vendorItems.length} linked item{vendorItems.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th>UOM</th>
                <th>Current Qty</th>
                <th>Min Qty</th>
                <th>Reorder Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vendorItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-secondary">
                    No items are currently linked to this vendor.
                  </td>
                </tr>
              ) : (
                vendorItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.sku || "-"}</td>
                    <td>{item.unit_of_measure || "-"}</td>
                    <td>{item.current_quantity}</td>
                    <td>{item.minimum_quantity}</td>
                    <td>{item.reorder_quantity}</td>
                    <td>
                      <span className={`badge badge-${item.status === "active" ? "completed" : "cancelled"}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

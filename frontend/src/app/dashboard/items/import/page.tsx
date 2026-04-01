"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/api";

type ItemField =
  | "name"
  | "sku"
  | "unit_of_measure"
  | "current_quantity"
  | "minimum_quantity"
  | "reorder_quantity"
  | "status"
  | "vendor_id"
  | "barcode";

type ImportStep = "upload" | "mapping" | "review" | "result";

interface ReviewRow {
  id: string;
  name: string;
  sku: string;
  unit_of_measure: string;
  current_quantity: string;
  minimum_quantity: string;
  reorder_quantity: string;
  status: string;
  vendor_id: string;
  barcode: string;
}

interface ImportResult {
  created_count: number;
  skipped_count: number;
  errors: string[];
}

interface VendorOption {
  vendor_id: string;
  vendor_name: string;
}

interface ExistingItem {
  name: string;
  sku: string | null;
  barcode: string | null;
}

const FIELD_LABELS: Record<ItemField, string> = {
  name: "Item Name *",
  sku: "SKU",
  unit_of_measure: "Unit of Measure",
  current_quantity: "Current Quantity",
  minimum_quantity: "Minimum Quantity",
  reorder_quantity: "Reorder Quantity",
  status: "Status",
  vendor_id: "Vendor",
  barcode: "Barcode",
};

const REQUIRED_FIELDS: ItemField[] = ["name"];
const ALL_FIELDS: ItemField[] = [
  "name",
  "sku",
  "unit_of_measure",
  "current_quantity",
  "minimum_quantity",
  "reorder_quantity",
  "status",
  "vendor_id",
  "barcode",
];

const UNIT_OPTIONS = ["ea", "box", "pack", "bottle", "kg", "L", "mL", "other"];

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function suggestedFieldForHeader(header: string): ItemField | "" {
  const n = normalizeHeader(header);
  if (["name", "item_name", "product_name"].includes(n)) return "name";
  if (["sku", "item_sku", "product_sku", "code"].includes(n)) return "sku";
  if (["unit", "unit_of_measure", "uom"].includes(n)) return "unit_of_measure";
  if (["qty", "quantity", "current_qty", "current_quantity", "on_hand"].includes(n)) {
    return "current_quantity";
  }
  if (["minimum_qty", "minimum_quantity", "min_qty", "min_quantity", "par_level"].includes(n)) {
    return "minimum_quantity";
  }
  if (["reorder_qty", "reorder_quantity", "order_qty"].includes(n)) return "reorder_quantity";
  if (["status", "active_status"].includes(n)) return "status";
  if (["vendor_id", "supplier_id"].includes(n)) return "vendor_id";
  if (["barcode", "bar_code", "upc", "ean"].includes(n)) return "barcode";
  return "";
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      currentRow.push(currentCell);
      currentCell = "";
      const isNonEmptyRow = currentRow.some((cell) => cell.trim() !== "");
      if (isNonEmptyRow) rows.push(currentRow);
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim() !== "")) rows.push(currentRow);
  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((h, index) => {
      record[h] = (row[index] ?? "").trim();
    });
    return record;
  });

  return { headers, rows: dataRows };
}

function emptyReviewRow(id: string): ReviewRow {
  return {
    id,
    name: "",
    sku: "",
    unit_of_measure: "",
    current_quantity: "",
    minimum_quantity: "",
    reorder_quantity: "",
    status: "",
    vendor_id: "",
    barcode: "",
  };
}

function normalizeMatchValue(value: string): string {
  return value.trim().toLowerCase();
}

export default function ImportItemsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<ItemField, string>>({} as Record<ItemField, string>);
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [existingItems, setExistingItems] = useState<ExistingItem[]>([]);

  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

  const missingRequiredFields = REQUIRED_FIELDS.filter((field) => !mapping[field]);
  const reviewValidation = useMemo(() => {
    const rowErrors: Record<string, Partial<Record<ItemField, string>>> = {};
    const seenSkus = new Map<string, number[]>();
    const vendorIds = new Set(vendors.map((v) => v.vendor_id));

    for (const [index, row] of reviewRows.entries()) {
      const errorsForRow: Partial<Record<ItemField, string>> = {};
      if (!row.name.trim()) {
        errorsForRow.name = "Name is required.";
      }
      if (row.status.trim()) {
        const normalizedStatus = row.status.trim().toLowerCase();
        if (normalizedStatus !== "active" && normalizedStatus !== "inactive") {
          errorsForRow.status = "Use active or inactive.";
        }
      }
      for (const numField of ["current_quantity", "minimum_quantity", "reorder_quantity"] as ItemField[]) {
        const value = row[numField].trim();
        if (!value) continue;
        if (!/^-?\d+(\.\d+)?$/.test(value)) {
          errorsForRow[numField] = "Enter a number.";
        }
      }
      if (row.vendor_id.trim() && !vendorIds.has(row.vendor_id.trim())) {
        errorsForRow.vendor_id = "Choose a vendor from the list.";
      }
      const sku = row.sku.trim();
      if (sku) {
        const existing = seenSkus.get(sku) || [];
        existing.push(index);
        seenSkus.set(sku, existing);
      }
      rowErrors[row.id] = errorsForRow;
    }

    for (const indexes of seenSkus.values()) {
      if (indexes.length <= 1) continue;
      for (const idx of indexes) {
        const rowId = reviewRows[idx]?.id;
        if (!rowId) continue;
        rowErrors[rowId] = {
          ...rowErrors[rowId],
          sku: "Duplicate SKU in this import.",
        };
      }
    }

    const validCount = reviewRows.filter(
      (row) => Object.keys(rowErrors[row.id] || {}).length === 0
    ).length;
    return { rowErrors, validCount };
  }, [reviewRows, vendors]);
  const stockMatchWarnings = useMemo(() => {
    const names = new Set(
      existingItems.map((item) => normalizeMatchValue(item.name)).filter(Boolean)
    );
    const skus = new Set(
      existingItems
        .map((item) => normalizeMatchValue(item.sku || ""))
        .filter(Boolean)
    );
    const barcodes = new Set(
      existingItems
        .map((item) => normalizeMatchValue(item.barcode || ""))
        .filter(Boolean)
    );

    const warnings: Record<string, Partial<Record<"name" | "sku" | "barcode", string>>> = {};
    for (const row of reviewRows) {
      const rowWarnings: Partial<Record<"name" | "sku" | "barcode", string>> = {};
      const name = normalizeMatchValue(row.name);
      const sku = normalizeMatchValue(row.sku);
      const barcode = normalizeMatchValue(row.barcode);

      if (name && names.has(name)) rowWarnings.name = "Matches existing item name.";
      if (sku && skus.has(sku)) rowWarnings.sku = "Matches existing SKU.";
      if (barcode && barcodes.has(barcode)) rowWarnings.barcode = "Matches existing barcode.";
      warnings[row.id] = rowWarnings;
    }
    return warnings;
  }, [reviewRows, existingItems]);

  useEffect(() => {
    fetchWithAuth("/api/vendors")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: VendorOption[]) => setVendors(data))
      .catch(() => setVendors([]));
  }, []);

  useEffect(() => {
    fetchWithAuth("/api/items")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ExistingItem[]) => setExistingItems(data))
      .catch(() => setExistingItems([]));
  }, []);

  function handleMapChange(field: ItemField, columnName: string) {
    setMapping((prev) => ({ ...prev, [field]: columnName }));
  }

  function goToMapping() {
    if (!rows.length) {
      setError("Upload a CSV file first.");
      return;
    }
    setError(null);
    setStep("mapping");
  }

  function goToReview() {
    if (missingRequiredFields.length > 0) {
      setError("Map all required fields before continuing.");
      return;
    }
    const nextRows: ReviewRow[] = rows.map((rawRow, index) => {
      const mapped = emptyReviewRow(String(index + 1));
      for (const field of ALL_FIELDS) {
        const columnName = mapping[field];
        mapped[field] = columnName ? (rawRow[columnName] || "").trim() : "";
      }
      return mapped;
    });
    setReviewRows(nextRows);
    setError(null);
    setStep("review");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setStep("upload");
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.headers.length === 0) {
        setError("CSV appears to be empty.");
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setReviewRows([]);

      const suggested: Record<ItemField, string> = {} as Record<ItemField, string>;
      for (const header of parsed.headers) {
        const field = suggestedFieldForHeader(header);
        if (field && !suggested[field]) suggested[field] = header;
      }
      setMapping(suggested);
    } catch {
      setError("Unable to read CSV file.");
    }
  }

  function updateReviewCell(rowId: string, field: ItemField, value: string) {
    setReviewRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  }

  function removeReviewRow(rowId: string) {
    setReviewRows((prev) => prev.filter((row) => row.id !== rowId));
  }

  async function handleConfirmImport() {
    setError(null);
    setResult(null);
    if (!reviewRows.length) {
      setError("No rows to import.");
      return;
    }
    if (reviewValidation.validCount !== reviewRows.length) {
      setError("Fix invalid cells before confirming.");
      return;
    }

    const identityMapping: Record<string, string> = {};
    for (const field of ALL_FIELDS) {
      identityMapping[field] = field;
    }

    const payloadRows = reviewRows.map((row) => {
      const record: Record<string, string> = {};
      for (const field of ALL_FIELDS) {
        record[field] = row[field].trim();
      }
      return record;
    });

    setIsImporting(true);
    try {
      const res = await fetchWithAuth("/api/items/bulk-import", {
        method: "POST",
        body: JSON.stringify({
          rows: payloadRows,
          mapping: identityMapping,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "Bulk import failed.");
        return;
      }
      setResult(data);
      setStep("result");
    } catch {
      setError("Network error while importing.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ color: "var(--primary)" }}>Import Items from CSV</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Upload, map columns, review/edit rows, then confirm import.
        </p>
      </div>

      <div
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          overflowX: "hidden",
        }}
      >
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 0 }}>
          Step: {step === "upload" ? "Upload" : step === "mapping" ? "Map Columns" : step === "review" ? "Review & Edit" : "Result"}
        </p>

        {step === "upload" && (
          <>
            <div>
              <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.35rem" }}>
                CSV File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose CSV File
              </button>
              {fileName && (
                <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Loaded: {fileName}
                </p>
              )}
            </div>

            {previewRows.length > 0 && (
              <div>
                <h3 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>Preview (first 5 rows)</h3>
                <div className="table-container" style={{ overflowX: "visible", width: "100%" }}>
                  <table style={{ width: "100%", tableLayout: "fixed" }}>
                    <thead>
                      <tr>
                        {headers.map((h) => (
                          <th key={h} style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, idx) => (
                        <tr key={idx}>
                          {headers.map((h) => (
                            <td key={h} style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{row[h] || "—"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
              <Link href="/dashboard/items" className="btn-secondary">
                Cancel
              </Link>
              <button
                type="button"
                className="btn-primary"
                onClick={goToMapping}
                disabled={rows.length === 0}
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === "mapping" && (
          <>
            <div>
              <h3 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>Map Columns</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {ALL_FIELDS.map((field) => (
                  <div key={field} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{FIELD_LABELS[field]}</label>
                    <select
                      className="input-field"
                      value={mapping[field] || ""}
                      onChange={(e) => handleMapChange(field, e.target.value)}
                    >
                      <option value="">-- not mapped --</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {missingRequiredFields.length > 0 && (
                <p style={{ color: "var(--danger)", fontSize: "0.875rem", marginTop: "0.75rem" }}>
                  Missing required mapping: {missingRequiredFields.join(", ")}
                </p>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep("upload")}
              >
                Back
              </button>
              <button type="button" className="btn-primary" onClick={goToReview}>
                Next
              </button>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            <div>
              <h3 style={{ marginBottom: "0.25rem", fontSize: "1rem" }}>Review and Edit</h3>
              <p style={{ marginBottom: "0.75rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Red input borders indicate invalid values that need fixing.
              </p>
              <p style={{ marginBottom: "0.75rem", fontSize: "0.8rem", color: "#92400e" }}>
                Amber borders indicate a match with existing stock (name/SKU/barcode).
              </p>
              <div className="table-container" style={{ overflowX: "visible", width: "100%" }}>
                <table style={{ width: "100%", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 88 }}>Actions</th>
                      {ALL_FIELDS.map((field) => (
                        <th key={field} style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                          {FIELD_LABELS[field]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reviewRows.map((row) => {
                      const rowErrors = reviewValidation.rowErrors[row.id] || {};
                      const rowWarnings = stockMatchWarnings[row.id] || {};
                      return (
                        <tr key={row.id}>
                          <td>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                              onClick={() => removeReviewRow(row.id)}
                            >
                              Remove
                            </button>
                          </td>
                          {ALL_FIELDS.map((field) => (
                            <td key={field}>
                              {field === "status" ? (
                                <select
                                  className="input-field"
                                  value={row.status}
                                  onChange={(e) => updateReviewCell(row.id, field, e.target.value)}
                                  style={{
                                    width: "100%",
                                    borderColor: rowErrors[field] ? "var(--danger)" : undefined,
                                    boxShadow: rowErrors[field] ? "0 0 0 1px var(--danger)" : undefined,
                                    minWidth: 0,
                                  }}
                                >
                                  <option value="">-- blank --</option>
                                  <option value="active">active</option>
                                  <option value="inactive">inactive</option>
                                </select>
                              ) : field === "unit_of_measure" ? (
                                <select
                                  className="input-field"
                                  value={row.unit_of_measure}
                                  onChange={(e) => updateReviewCell(row.id, field, e.target.value)}
                                  style={{
                                    width: "100%",
                                    borderColor: rowErrors[field] ? "var(--danger)" : undefined,
                                    boxShadow: rowErrors[field] ? "0 0 0 1px var(--danger)" : undefined,
                                    minWidth: 0,
                                  }}
                                >
                                  <option value="">-- blank --</option>
                                  {UNIT_OPTIONS.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ))}
                                  {row.unit_of_measure &&
                                    !UNIT_OPTIONS.includes(row.unit_of_measure) && (
                                      <option value={row.unit_of_measure}>
                                        {row.unit_of_measure}
                                      </option>
                                    )}
                                </select>
                              ) : field === "vendor_id" ? (
                                <select
                                  className="input-field"
                                  value={row.vendor_id}
                                  onChange={(e) => updateReviewCell(row.id, field, e.target.value)}
                                  style={{
                                    width: "100%",
                                    borderColor: rowErrors[field] ? "var(--danger)" : undefined,
                                    boxShadow: rowErrors[field] ? "0 0 0 1px var(--danger)" : undefined,
                                    minWidth: 0,
                                  }}
                                >
                                  <option value="">-- no vendor --</option>
                                  {vendors.map((vendor) => (
                                    <option key={vendor.vendor_id} value={vendor.vendor_id}>
                                      {vendor.vendor_name}
                                    </option>
                                  ))}
                                  {row.vendor_id &&
                                    !vendors.some((vendor) => vendor.vendor_id === row.vendor_id) && (
                                      <option value={row.vendor_id}>
                                        Unknown vendor ({row.vendor_id})
                                      </option>
                                    )}
                                </select>
                              ) : (
                                <input
                                  className="input-field"
                                  value={row[field]}
                                  onChange={(e) => updateReviewCell(row.id, field, e.target.value)}
                                  placeholder={field === "name" ? "Required" : ""}
                                  style={{
                                    width: "100%",
                                    borderColor: rowErrors[field]
                                      ? "var(--danger)"
                                      : (field === "name" || field === "sku" || field === "barcode") &&
                                          rowWarnings[field]
                                        ? "#d97706"
                                        : undefined,
                                    boxShadow: rowErrors[field]
                                      ? "0 0 0 1px var(--danger)"
                                      : (field === "name" || field === "sku" || field === "barcode") &&
                                          rowWarnings[field]
                                        ? "0 0 0 1px #d97706"
                                        : undefined,
                                    minWidth: 0,
                                  }}
                                />
                              )}
                              {rowErrors[field] && (
                                <div style={{ color: "var(--danger)", fontSize: "0.72rem", marginTop: "0.2rem" }}>
                                  {rowErrors[field]}
                                </div>
                              )}
                              {!rowErrors[field] &&
                                (field === "name" || field === "sku" || field === "barcode") &&
                                rowWarnings[field] && (
                                  <div style={{ color: "#92400e", fontSize: "0.72rem", marginTop: "0.2rem" }}>
                                    {rowWarnings[field]}
                                  </div>
                                )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {reviewRows.length === 0 && (
                      <tr>
                        <td colSpan={ALL_FIELDS.length + 1} style={{ color: "var(--text-secondary)" }}>
                          No rows left. Go back and re-import or add rows in CSV.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Valid rows: {reviewValidation.validCount} / {reviewRows.length}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep("mapping")}
              >
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmImport}
                disabled={
                  isImporting ||
                  reviewRows.length === 0 ||
                  reviewValidation.validCount !== reviewRows.length
                }
              >
                {isImporting ? "Importing..." : "Confirm"}
              </button>
            </div>
          </>
        )}

        {step === "result" && result && (
          <>
            <div style={{ background: "#ecfdf5", border: "1px solid #86efac", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem" }}>
              <p style={{ color: "#166534", fontWeight: 600 }}>
                Import complete: {result.created_count} created, {result.skipped_count} skipped.
              </p>
              {result.errors.length > 0 && (
                <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem", color: "#166534" }}>
                  {result.errors.slice(0, 20).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
              <button type="button" className="btn-secondary" onClick={() => setStep("review")}>
                Back
              </button>
              <Link href="/dashboard/items" className="btn-primary">
                Done
              </Link>
            </div>
          </>
        )}

        {error && (
          <p style={{ color: "var(--danger)", fontSize: "0.875rem" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

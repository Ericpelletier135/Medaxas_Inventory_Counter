"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ItemFormValues {
  name: string;
  sku: string;
  unit_of_measure: string;
  current_quantity: number;
  minimum_quantity: number;
  reorder_quantity: number;
  status: "active" | "inactive";
  vendor_id: string;
  barcode: string;
  no_barcode: boolean;
}

interface Vendor {
  vendor_id: string;
  vendor_name: string;
}

interface Props {
  initialValues?: Partial<ItemFormValues>;
  onSubmit: (data: Omit<ItemFormValues, "no_barcode">) => Promise<void>;
  isSubmitting: boolean;
  submitLabel?: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_VALUES: ItemFormValues = {
  name: "",
  sku: "",
  unit_of_measure: "",
  current_quantity: 0,
  minimum_quantity: 0,
  reorder_quantity: 0,
  status: "active",
  vendor_id: "",
  barcode: "",
  no_barcode: false,
};

// ─── Unit options ─────────────────────────────────────────────────────────────

const UNIT_OPTIONS = [
  { value: "", label: "— select —" },
  { value: "ea", label: "Each (ea)" },
  { value: "box", label: "Box" },
  { value: "pack", label: "Pack" },
  { value: "bottle", label: "Bottle" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "L", label: "Litre (L)" },
  { value: "mL", label: "Millilitre (mL)" },
  { value: "other", label: "Other" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ItemForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel = "Save Item",
}: Props) {
  const [values, setValues] = useState<ItemFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
    no_barcode: initialValues?.no_barcode ?? false,
  });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);

  // AI scan state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Load vendors for dropdown
  useEffect(() => {
    fetchWithAuth("/api/vendors")
      .then((r) => r.json())
      .then((data: Vendor[]) => setVendors(data))
      .catch(() => {/* non-fatal */});
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function set<K extends keyof ItemFormValues>(
    key: K,
    value: ItemFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // ── AI image processing (shared) ───────────────────────────────────────────

  async function processBase64Image(base64: string, mimeType: string) {
    setAiLoading(true);
    setAiError(null);

    try {
      const res = await fetchWithAuth("/api/gemini/scan-item", {
        method: "POST",
        body: JSON.stringify({ image_base64: base64, mime_type: mimeType }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "AI scan failed.");
      }

      const data = await res.json();

      setValues((prev) => ({
        ...prev,
        name: data.name ?? prev.name,
        sku: data.sku ?? prev.sku,
        unit_of_measure: data.unit_of_measure ?? prev.unit_of_measure,
        barcode: data.barcode ?? prev.barcode,
      }));
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "AI scan failed.");
    } finally {
      setAiLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "image/svg+xml" || file.name.endsWith(".svg")) {
      setAiError("SVG images are not supported. Please upload a JPEG, PNG, or WebP photo.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAiPreview(objectUrl);

    // Convert to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    await processBase64Image(base64, file.type);
  }

  // ── Camera capture ─────────────────────────────────────────────────────────

  async function startCamera() {
    try {
      setAiError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      // Wait for React to render the <video> element before attaching the stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => console.error("Video play failed", e));
        }
      }, 100);
    } catch (err) {
      setAiError("Could not access camera. Please check permissions.");
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  }

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 JPEG
    const base64 = canvas.toDataURL("image/jpeg", 0.9);
    
    // Cleanup camera
    stopCamera();
    
    // Feed to existing flow
    setAiPreview(base64);
    await processBase64Image(base64, "image/jpeg");
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) stopCamera();
    };
  }, [cameraStream]);

  // ── Form submit ────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.name.trim()) {
      setError("Item name is required.");
      return;
    }
    if (!values.no_barcode && !values.barcode.trim()) {
      setError("Please enter a barcode, or tick 'This item has no barcode'.");
      return;
    }

    const { no_barcode, ...payload } = values;
    await onSubmit({
      ...payload,
      barcode: no_barcode ? "" : payload.barcode,
      vendor_id: payload.vendor_id || "",
    });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── AI Image Upload ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginBottom: "0.75rem", fontSize: "0.95rem", color: "var(--primary)" }}>
          ✨ AI Auto-fill from Photo
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
          Upload a product photo and we'll pre-fill the form for you.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--primary)",
              color: "var(--primary)",
              fontWeight: 500,
              fontSize: "0.875rem",
              cursor: aiLoading || showCamera ? "not-allowed" : "pointer",
              opacity: aiLoading || showCamera ? 0.7 : 1,
              transition: "background 0.2s",
            }}
          >
            {aiLoading ? "Scanning…" : "📷 Upload Photo"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleImageUpload}
              disabled={aiLoading || showCamera}
            />
          </label>

          <button
            type="button"
            onClick={startCamera}
            disabled={aiLoading || showCamera}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-md)",
              background: "transparent",
              border: "1px dashed var(--primary)",
              color: "var(--primary)",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: aiLoading || showCamera ? "not-allowed" : "pointer",
              opacity: aiLoading || showCamera ? 0.7 : 1,
              transition: "background 0.2s",
            }}
          >
            🎥 Take Photo
          </button>

          {aiPreview && !showCamera && (
            <img
              src={aiPreview}
              alt="Product preview"
              style={{
                width: 72,
                height: 72,
                objectFit: "cover",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            />
          )}
        </div>

        {/* Camera UI overlay */}
        {showCamera && (
          <div style={{ 
            marginTop: "1rem", 
            padding: "1rem", 
            background: "#000", 
            borderRadius: "var(--radius-lg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem"
          }}>
            <video
              ref={videoRef}
              style={{ width: "100%", maxWidth: 400, borderRadius: "var(--radius-md)" }}
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={stopCamera}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "2rem",
                  background: "#333",
                  color: "#fff",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                style={{
                  padding: "0.5rem 1.5rem",
                  borderRadius: "2rem",
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📸 Capture
              </button>
            </div>
          </div>
        )}

        {aiError && (
          <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
            {aiError}
          </p>
        )}
      </div>

      {/* ── Core Fields ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

        <FormField label="Item Name *">
          <input
            className="input-field"
            type="text"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Nitrile Exam Gloves"
            required
          />
        </FormField>

        <FormField label="SKU">
          <input
            className="input-field"
            type="text"
            value={values.sku}
            onChange={(e) => set("sku", e.target.value)}
            placeholder="e.g. GLV-NTR-L-100"
          />
        </FormField>

        <FormField label="Unit of Measure">
          <input
            list="unit-options"
            className="input-field"
            type="text"
            value={values.unit_of_measure}
            onChange={(e) => set("unit_of_measure", e.target.value)}
            placeholder="Select or type unit"
          />
          <datalist id="unit-options">
            {UNIT_OPTIONS.filter((opt) => opt.value !== "").map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </datalist>
        </FormField>

        <FormField label="Status">
          <select
            className="input-field"
            value={values.status}
            onChange={(e) => set("status", e.target.value as "active" | "inactive")}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </FormField>
      </div>

      {/* ── Quantities ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <FormField label="Current Qty">
          <input
            className="input-field"
            type="number"
            min={0}
            value={values.current_quantity}
            onChange={(e) => set("current_quantity", Math.max(0, Number(e.target.value)))}
          />
        </FormField>
        <FormField label="Minimum Qty">
          <input
            className="input-field"
            type="number"
            min={0}
            value={values.minimum_quantity}
            onChange={(e) => set("minimum_quantity", Math.max(0, Number(e.target.value)))}
          />
        </FormField>
        <FormField label="Reorder Qty">
          <input
            className="input-field"
            type="number"
            min={0}
            value={values.reorder_quantity}
            onChange={(e) => set("reorder_quantity", Math.max(0, Number(e.target.value)))}
          />
        </FormField>
      </div>

      {/* ── Vendor & Barcode ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <FormField label="Vendor">
          <select
            className="input-field"
            value={values.vendor_id}
            onChange={(e) => set("vendor_id", e.target.value)}
          >
            <option value="">— no vendor —</option>
            {vendors.map((v) => (
              <option key={v.vendor_id} value={v.vendor_id}>
                {v.vendor_name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Barcode">
          <input
            className="input-field"
            type="text"
            value={values.barcode}
            disabled={values.no_barcode}
            onChange={(e) => set("barcode", e.target.value)}
            placeholder="Scan or type barcode"
            style={{ opacity: values.no_barcode ? 0.5 : 1 }}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              marginTop: "0.4rem",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={values.no_barcode}
              onChange={(e) => {
                set("no_barcode", e.target.checked);
                if (e.target.checked) set("barcode", "");
              }}
            />
            This item has no barcode
          </label>
        </FormField>
      </div>

      {/* ── Error & Submit ───────────────────────────────────────────── */}
      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.875rem" }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/dashboard/items" className="btn-secondary">
          Cancel
        </a>
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting || aiLoading}
          style={{ minWidth: 120 }}
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── Small helper for consistent label + input layout ──────────────────────

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

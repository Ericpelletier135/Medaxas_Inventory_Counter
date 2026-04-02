"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import Link from "next/link";

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

  function set<K extends keyof ItemFormValues>(
    key: K,
    value: ItemFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

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

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    await processBase64Image(base64, file.type);
  }

  async function startCamera() {
    try {
      setAiError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      setShowCamera(true);
      
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
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL("image/jpeg", 0.9);
    
    stopCamera();
    
    setAiPreview(base64);
    await processBase64Image(base64, "image/jpeg");
  }

  useEffect(() => {
    return () => {
      if (cameraStream) stopCamera();
    };
  }, [cameraStream]);

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

  return (
    <form onSubmit={handleSubmit} className="flex-col gap-6">

      {/* AI Image Upload */}
      <div className="card">
        <h3 className="text-primary mb-2">✨ AI Auto-fill from Photo</h3>
        <p className="text-secondary mb-4" style={{ fontSize: "0.85rem" }}>
          Upload a product photo and we'll pre-fill the form for you.
        </p>

        <div className="flex-row items-center gap-4 flex-wrap">
          <label
            className={`btn-secondary ${aiLoading || showCamera ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
            style={{ borderStyle: "dashed", borderColor: "var(--primary)", color: "var(--primary)" }}
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
            className={`btn-secondary ${aiLoading || showCamera ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
            style={{ borderStyle: "dashed", borderColor: "var(--primary)", color: "var(--primary)" }}
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
          <div className="flex-col items-center gap-4 mt-4 p-4" style={{ background: "#000", borderRadius: "var(--radius-lg)" }}>
            <video
              ref={videoRef}
              style={{ width: "100%", maxWidth: 400, borderRadius: "var(--radius-md)" }}
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            
            <div className="flex-row gap-4">
              <button type="button" onClick={stopCamera} className="btn-secondary" style={{ background: "#333", color: "#fff", border: "none", borderRadius: "2rem", padding: "0.5rem 1.5rem" }}>
                Cancel
              </button>
              <button type="button" onClick={capturePhoto} className="btn-primary" style={{ borderRadius: "2rem", padding: "0.5rem 1.5rem" }}>
                📸 Capture
              </button>
            </div>
          </div>
        )}

        {aiError && (
          <p className="form-error mt-2">{aiError}</p>
        )}
      </div>

      <div className="form-grid cols-2">
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

      <div className="form-grid cols-2">
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

      <div className="form-grid cols-2">
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
          <label className="flex-row items-center gap-2 mt-2 text-secondary cursor-pointer" style={{ fontSize: "0.85rem", userSelect: "none" }}>
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

      {error && (
        <p className="form-error">{error}</p>
      )}

      <div className="flex-row gap-3 justify-end mt-4">
        <Link href="/dashboard/items" className="btn-secondary">
          Cancel
        </Link>
        <button
          type="submit"
          className="btn-primary flex-row items-center justify-center gap-2"
          disabled={isSubmitting || aiLoading}
          style={{ minWidth: 120 }}
        >
          {isSubmitting && <span className="spinner" />}
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-group mb-0">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

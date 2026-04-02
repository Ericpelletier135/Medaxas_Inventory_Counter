// src/components/LoadingView.tsx
export default function LoadingView({ message = "Loading data..." }: { message?: string }) {
  return (
    <div className="flex-col w-full items-center justify-center gap-4" style={{ minHeight: "40vh" }}>
      <span
        className="spinner"
        style={{
          width: "3rem",
          height: "3rem",
          borderColor: "rgba(0, 0, 0, 0.1)",
          borderTopColor: "var(--primary)",
          borderWidth: "4px",
        }}
      />
      <p className="text-secondary" style={{ fontSize: "0.95rem" }}>
        {message}
      </p>
    </div>
  );
}

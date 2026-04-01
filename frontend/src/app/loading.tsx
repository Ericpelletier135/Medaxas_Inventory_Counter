export default function RootLoading() {
  return (
    <div className="flex-col w-full items-center justify-center gap-4" style={{ minHeight: "100vh", backgroundColor: "var(--background)" }}>
      <span
        className="spinner"
        style={{
          width: "3rem",
          height: "3rem",
          borderTopColor: "var(--primary)",
          borderColor: "rgba(0, 0, 0, 0.05)",
          borderWidth: "4px",
          opacity: 0.8,
        }}
      />
      <p className="text-secondary" style={{ fontSize: "1rem", fontWeight: 500 }}>
        Loading Medaxas...
      </p>
    </div>
  );
}

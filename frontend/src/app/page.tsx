import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1.5rem",
      }}
    >
      <h1>Medaxas Inventory Counter</h1>
      <nav style={{ display: "flex", gap: "1rem" }}>
        <Link
          href="/login"
          style={{
            padding: "0.75rem 1.5rem",
            background: "#0070f3",
            color: "#fff",
            borderRadius: "6px",
            textDecoration: "none",
          }}
        >
          Login
        </Link>
        <Link
          href="/register"
          style={{
            padding: "0.75rem 1.5rem",
            border: "1px solid #0070f3",
            color: "#0070f3",
            borderRadius: "6px",
            textDecoration: "none",
          }}
        >
          Register
        </Link>
      </nav>
    </main>
  );
}

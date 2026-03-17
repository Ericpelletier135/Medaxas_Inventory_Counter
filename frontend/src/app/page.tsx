"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // If we have a token, head straight to the dashboard
    if (localStorage.getItem("access_token")) {
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1.5rem",
        backgroundColor: "var(--background)",
        color: "var(--text-primary)"
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ color: "var(--primary)", fontSize: "2.5rem", marginBottom: "0.5rem" }}>Medaxas</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>by Divocco</p>
      </div>
      
      <p style={{ maxWidth: "500px", textAlign: "center", marginBottom: "1rem" }}>
        Secure inventory counting and sales order automation.
      </p>

      <nav style={{ display: "flex", gap: "1rem" }}>
        <Link href="/login" className="btn-primary" style={{ padding: "0.75rem 2rem" }}>
          Login
        </Link>
        <Link href="/register" className="btn-secondary" style={{ padding: "0.75rem 2rem" }}>
          Register
        </Link>
      </nav>
    </main>
  );
}

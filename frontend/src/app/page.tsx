"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function routeAuthenticatedUser() {
      if (!localStorage.getItem("access_token")) return;
      const user = await fetchCurrentUser();
      router.push(user?.is_admin ? "/admin/users" : "/dashboard");
    }

    routeAuthenticatedUser();
  }, [router]);

  return (
    <main className="hero-section">
      <div className="text-center mb-8">
        <h1 className="text-primary" style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Medaxas</h1>
        <p className="text-secondary" style={{ fontSize: "1.1rem" }}>by Divocco</p>
      </div>

      <p className="text-center mb-4 max-w-md">
        Secure inventory counting and sales order automation.
      </p>

      <nav className="flex-row gap-4 items-center justify-center">
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

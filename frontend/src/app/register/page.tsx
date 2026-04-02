"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Registration failed");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-8">
          <h1 className="text-primary mb-2" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
            Medaxas
          </h1>
          <p className="text-secondary" style={{ fontSize: "0.95rem" }}>
            Create your account
          </p>
        </div>
        {success ? (
          <p className="text-center" style={{ color: "var(--success)" }}>Account created! Redirecting to login...</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex-col gap-4">
            <div className="form-grid cols-2">
              <div className="form-group mb-0">
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="form-group mb-0">
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
            <div className="form-group mb-0">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
              />
            </div>
            <div className="form-group mb-0">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
              />
            </div>
            <button type="submit" className="btn-primary mt-2 flex-row items-center justify-center gap-2" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? "Creating..." : "Create Account"}
            </button>
            {error && <p className="form-error text-center">{error}</p>}
            
            <p className="text-center text-secondary mt-4" style={{ fontSize: "0.875rem" }}>
              Already have an account?{" "}
              <Link href="/login" className="text-primary" style={{ fontWeight: 500 }}>
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface CurrentUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  status: string;
}

export function clearAuthTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  let token = localStorage.getItem("access_token");

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized (token expired)
  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      window.location.href = "/login";
      return response;
    }

    try {
      const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ refresh_token: refreshToken }),
      });

      if (!refreshRes.ok) {
        clearAuthTokens();
        window.location.href = "/login";
        return response;
      }

      const data = await refreshRes.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      // Retry original request
      headers.set("Authorization", `Bearer ${data.access_token}`);
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch {
      window.location.href = "/login";
    }
  }

  return response;
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const res = await fetchWithAuth("/api/auth/me");
  if (!res.ok) return null;
  return res.json();
}

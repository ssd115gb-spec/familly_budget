import { useAppStore } from "./store";

const API_BASE = "/api";

export async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const token = useAppStore.getState().accessToken;
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // If unauthorized, attempt to perform silent refresh
  if (res.status === 401 || res.status === 101) {
    try {
      const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        const currentUser = useAppStore.getState().user;
        useAppStore.getState().setSession(currentUser, data.accessToken);
        
        // Retry the original request
        headers.set("Authorization", `Bearer ${data.accessToken}`);
        res = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers,
        });
      } else {
        useAppStore.getState().clearSession();
        throw new Error("Session expired. Please log in again.");
      }
    } catch (e) {
      useAppStore.getState().clearSession();
      throw e;
    }
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "API Request Failed");
  }

  // Handle case where response might be empty or message only
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

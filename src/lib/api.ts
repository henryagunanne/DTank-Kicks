// ─── Central API layer ────────────────────────────────────────────────────────
//
// All fetch calls to the Express backend live here.
// The Vite proxy forwards /api/* → http://localhost:4000/api/*
// so we never hardcode the backend port in component code.
//
// Every function throws on network failure so TanStack Query's
// isError state gets triggered correctly.



const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "";






// ─────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────

// Fetch the user's orders — returns an array of order objects with details and line items
export async function fetchOrders(token: string): Promise<any[]> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/orders/my`, {
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch orders");
  }

  return res.json();
}



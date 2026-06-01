// This file contains API calls related to orders, such as fetching the user's orders and order details. 
// These functions are used by the account/orders page and order details page to display the user's 
// order history and details.

// Determine API base URL from environment variable, with a fallback for server-side rendering
const API_BASE = typeof window === "undefined" ? (import.meta as any).env?.VITE_API_URL || "http://localhost:4000" : "";


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



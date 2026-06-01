
// ─────────────────────────── Cart API calls ───────────────────────────
// These are used by the cart context to keep the cart in sync with the backend for logged-in users.
// For guests, the cart context uses localStorage and doesn't call these functions at all.

import type { CartItem } from "./types";

// Determine API base URL from environment variable, with a fallback for server-side rendering
const API_BASE = typeof window === "undefined" ? (import.meta as any).env?.VITE_API_URL || "http://localhost:4000" : "";


export interface ServerCart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}


// Generic helper for making API requests with proper headers and error handling
async function request<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cart API ${res.status}: ${text || res.statusText}`);
  }
  const data = (await res.json().catch(() => ({}))) as any;
  return data as T;
}

// The cart context calls these functions to fetch the cart, add/update items, remove items, 
// and merge a guest cart on login. Each function normalizes the response into the ServerCart shape.
function normalize(raw: any): ServerCart {
  const items: CartItem[] = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
  const safeItems = items.filter((i) => i && i.productId);
  const totalItems = safeItems.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalPrice = safeItems.reduce((s, i) => s + (i.priceAtAdd || 0) * (i.quantity || 0), 0);
  return { items: safeItems, totalItems, totalPrice };
}

export async function fetchCart(token: string | null): Promise<ServerCart> {
  const data = await request<any>("/api/cart", token);
  return normalize(data);
}

export async function addOrUpdateItem(item: CartItem, token: string | null): Promise<ServerCart> {
  const data = await request<any>("/api/cart", token, { method: "POST", body: JSON.stringify(item) });
  return normalize(data);
}

export async function removeItem(id: string, token: string | null): Promise<ServerCart> {
  const data = await request<any>(`/api/cart/${encodeURIComponent(id)}`, token, { method: "DELETE" });
  return normalize(data);
}

export async function mergeCart(guestItems: CartItem[], token: string | null): Promise<ServerCart> {
  const data = await request<any>("/api/cart/merge", token, {
    method: "PUT",
    body: JSON.stringify({ items: guestItems }),
  });
  return normalize(data);
}

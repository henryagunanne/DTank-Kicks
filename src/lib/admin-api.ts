// ──────────────── Admin Product APIs ────────────────────────────
// Admin product management API calls — used by the admin panel to create, update, and delete products

import type { Product } from "./types";

// Determine API base URL from environment variable, with a fallback for server-side rendering
const API_BASE = typeof window === "undefined" ? (import.meta as any).env?.VITE_API_URL || "http://localhost:4000" : "";

// These functions send FormData with multipart encoding to handle file uploads (product images).
export async function createProduct(formData: FormData, token: string | null): Promise<Product> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/products`, {
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create product");
  }

  return res.json();
}

export async function updateProduct(id: string, formData: FormData, token: string | null): Promise<Product> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/products/${id}`, {
    method: "PUT",
    credentials: "include",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to update product");
  }

  return res.json();
}

export async function deleteProduct(id: string, token: string | null): Promise<{ ok: boolean }> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/products/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to delete product");
  }

  return res.json();
}


// Fetch admin dashboard data (sales stats, inventory levels, recent orders) — used on the admin dashboard page
export async function fetchAdminDashboard(token: string | null): Promise<any> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch dashboard data");
  }

  return res.json();
}


// Fetch all customers (admin only) — returns an array of user objects with their order history and wishlist items
export async function fetchAllCustomers(token: string | null): Promise<any[]> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/admin/customers`, {
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch customers");
  }

  return res.json();
}


// Fetch all orders (admin only) — returns an array of all orders with user info and line items
export async function fetchAllOrders(token: string): Promise<any[]> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/orders`, {
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch orders");
  }

  return res.json();
}


// Update the status of an order (admin only) — used on the admin orders page to mark orders as shipped, delivered, etc.
export async function updateOrderStatus(orderId: string, status: string, token: string): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
    method: "PUT",
    credentials: "include",
    headers,
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error("Failed to update order status");
  }
}

export async function approveReturnRequest(orderId: string, payload: { refundAmount?: number; adminNote?: string; items?: any[] }, token: string): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/orders/${orderId}/return-approve`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to approve return request");
  }
}


export async function issueRefund(orderId: string, payload: { refundAmount?: number; adminNote?: string; items?: any[] }, token: string): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/orders/${orderId}/refund`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to issue refund");
  }
}

export async function inspectReturn(returnId: string, payload: { inspection?: any; restock?: boolean }, token: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/returns/${returnId}/inspect`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to inspect return");
  }

  return res.json();
}

// Upload inspection photos (multipart/form-data). Returns array of uploaded file paths.
export async function uploadInspectionPhotos(files: File[], token: string | null): Promise<string[]> {
  const form = new FormData();
  files.forEach((f) => form.append("photos", f));

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/uploads/returns`, {
    method: "POST",
    credentials: "include",
    headers,
    body: form,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Upload failed");
  }

  const data = await res.json();
  return data.files || [];
}



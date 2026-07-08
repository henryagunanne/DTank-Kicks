// This file contains API calls related to orders, such as fetching the user's orders and order details. 
// These functions are used by the account/orders page and order details page to display the user's 
// order history and details.

import type {CartItem} from "./types";

// Determine API base URL from environment variable, with a fallback for server-side rendering
const API_BASE = typeof window === "undefined" ? (import.meta as any).env?.VITE_API_URL || "http://localhost:4000" : "";

export interface OrderItem {
  product: string;
  variantId: string;
  name: string;
  image: string;
  brand: string;
  size: number;
  color: string;
  quantity: number;
  price: number;
}

export interface CreateOrderPayload {
  items: OrderItem[];
  guestEmail?: string;
  shippingAddress: {
    name: string;
    email: string;
    phone: string;
    line1: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  deliveryMethod: "standard" | "express";
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
}

 
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


// Legacy API for creating an order. This is now handled by the Stripe checkout session, but this endpoint is kept for backward compatibility.
export async function createOrder(orderData: CreateOrderPayload, token?: string): Promise<any> {

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }


  const res = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(orderData),
  });

  if (!res.ok) {
    throw new Error("Failed to create order");
  }

  return res.json();
}



// Cancel an order by ID — returns the updated order object with status "cancelled"
export async function cancelOrder(orderId: string, token?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
    method: "POST",
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to cancel order");
  }
  
  return res.json();
}


// Track order using tracking token
export async function trackOrder(trackingNumber: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const res = await fetch(`${API_BASE}/api/orders/track/${trackingNumber}`, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to retrieve order");
  }
  
  return res.json();
}

// Track order using order ID
export async function trackOrderByID(orderId: string, token?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to retrieve order");
  }
  
  return res.json();
}
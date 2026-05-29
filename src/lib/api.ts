// ─── Central API layer ────────────────────────────────────────────────────────
//
// All fetch calls to the Express backend live here.
// The Vite proxy forwards /api/* → http://localhost:4000/api/*
// so we never hardcode the backend port in component code.
//
// Every function throws on network failure so TanStack Query's
// isError state gets triggered correctly.

import type { Product, Review } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  pages: number;
}

export interface ReviewsResponse {
  items: Review[];
  total: number;
  page: number;
  pages: number;
}

export interface ProductsParams {
  category?: string;
  brand?: string;
  size?: number;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sort?: "price-asc" | "price-desc" | "newest" | "rated";
  page?: number;
  limit?: number;
  q?: string;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function fetchProducts(params: ProductsParams = {},): Promise<ProductsResponse> {
  const query = new URLSearchParams();

  // Only append params that are actually set
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      query.set(k, String(v));
    }
  });

  const res = await fetch(`/api/products?${query}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

// New arrivals = most recently created products from the DB
// The server sorts by createdAt: -1 when sort=newest
export async function fetchNewArrivals(limit = 8): Promise<Product[]> {
  const data = await fetchProducts({ sort: "newest", limit });
  return data.items;
}


// Fetch a single product by its ID — used for product details page
export async function fetchProductById(id: string): Promise<Product> {
  const res = await fetch(`/api/products/${id}`);
  if (!res.ok) throw new Error("Product not found");
  return res.json();
}

// Fetch multiple products by their IDs in one batch
// Used by recently-viewed and wishlist to resolve stored IDs into full product objects
export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];

  // Fire all requests in parallel — much faster than sequential awaits
  const results = await Promise.allSettled(ids.map(fetchProductById));

  // Filter out any that 404'd (product deleted from DB since it was saved)
  return results
    .filter((r): r is PromiseFulfilledResult<Product> => r.status === "fulfilled")
    .map((r) => r.value);
}

// Fetch products filtered by brand — used for the "Shop by Brand" section
export async function fetchProductsByBrand(
  brand: string,
  limit = 4,
): Promise<Product[]> {
  const data = await fetchProducts({ brand, limit, sort: "newest" });
  return data.items;
}

// Fetch reviews for a product with pagination — used on the product details page and reviews page
export async function fetchReviews(productId: string, page = 1, limit = 10): Promise<ReviewsResponse> {
  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));

  const res = await fetch(`/api/products/${productId}/reviews?${query}`);
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json();
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────
// Fetch the user's wishlist items — returns full product objects, not just IDs
export async function fetchWishlist(token?: string): Promise<Product[]> { 
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch("/api/wishlist", {
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch wishlist");
  }

  return res.json();
}

export async function toggleWishlist( productId: string, token?: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(
    `/api/wishlist/toggle/${productId}`,
    {
      method: "POST",
      credentials: "include",
      headers,
    }
  );

  if (!res.ok) {
    throw new Error("Failed to update wishlist");
  }

  return res.json();
}



// ─────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────
export async function fetchOrders() {
  const res = await fetch("/api/orders/my-orders", {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch orders");
  }

  return res.json();
}





import type { Product, Review, Variant, Color, SizeStock } from "./types";

// Determine API base URL from environment variable, with a fallback for server-side rendering
const API_BASE = typeof window === "undefined" ? (import.meta as any).env?.VITE_API_URL || "http://localhost:4000" : "";


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



async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

function deriveSizes(variants: Variant[]): SizeStock[] {
  const m = new Map<number, number>();
  for (const v of variants) m.set(v.size, (m.get(v.size) ?? 0) + (v.stock ?? 0));
  return [...m.entries()].map(([size, stock]) => ({ size, stock })).sort((a, b) => a.size - b.size);
}

function deriveColors(variants: Variant[]): Color[] {
  const m = new Map<string, Color>();
  for (const v of variants) if (v.color?.name && !m.has(v.color.name)) m.set(v.color.name, v.color);
  return [...m.values()];
}



// ─── Products ─────────────────────────────────────────────────────────────────


// Normalize raw product data from the API into our frontend Product type
export function normalizeProduct(raw: any): Product {
  const variants: Variant[] = Array.isArray(raw?.variants)
    ? raw.variants.map((v: any) => ({
        id: String(v._id ?? v.id),
        size: Number(v.size),
        color: v.color,
        price: Number(v.price),
        compareAtPrice:
            v.compareAtPrice !== undefined
            ? Number(v.compareAtPrice)
            : undefined,
        stock: Number(v.stock ?? 0),
        }))
    : [];


  return {
    id: String(raw?._id ?? raw?.id ?? ""),
    name: raw?.name ?? "",
    brand: raw?.brand,
    category: raw?.category,
    description: raw?.description ?? "",
    images: Array.isArray(raw?.images) ? raw.images : [],
    variants,
    sizes: deriveSizes(variants),
    colors: deriveColors(variants),
    minPrice: variants.length > 0 ? Math.min(...variants.map(v => v.price)) : 0,
    maxPrice: variants.length > 0 ? Math.max(...variants.map(v => v.price)) : 0,
    rating: Number(raw?.rating ?? 0),
    reviewCount: Number(raw?.reviewCount ?? 0),
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    isNew: raw?.createdAt ? Date.now() - new Date(raw.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000 : false,
  };
}


// Fetch products with optional filters, sorting, and pagination — used for product listing pages and search results
export async function fetchProducts(params: ProductsParams = {}): Promise<ProductsResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const data = await request<any>(`/api/products${qs.toString() ? `?${qs}` : ""}`);

  return {
    items: (data?.items ?? []).map(normalizeProduct),
    total: Number(data?.total ?? 0),
    page: Number(data?.page ?? 1),
    pages: Number(data?.pages ?? 1),
  };
}

// Fetch a single product by its ID — used for product details page
export async function fetchProductById(id: string): Promise<Product> {
  if (!id || !/^[a-f0-9]{24}$/i.test(id)) {
    throw new Error("Invalid product id");
  }
  const raw = await request<Product>(`/api/products/${encodeURIComponent(id)}`);
  return normalizeProduct(raw);
}


// New arrivals = most recently created products from the DB
// The server sorts by createdAt: -1 when sort=newest
export async function fetchNewArrivals(limit = 8): Promise<Product[]> {
  const data = await fetchProducts({ sort: "newest", limit });
  return data.items;
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



// ──────────────── Reviews ───────────────────────────────────────────────

function normalizeReview(raw: any): Review {
  return {
    id: String(raw?._id ?? raw?.id ?? ""),
    productId: String(raw?.product ?? raw?.productId ?? ""),
    userName: raw?.user?.name ?? raw?.userName ?? "Anonymous",
    rating: Number(raw?.rating ?? 0),
    title: raw?.title ?? "",
    body: raw?.body ?? "",
    images: raw?.images ?? [],
    verifiedPurchase: !!raw?.verifiedPurchase,
    createdAt: raw?.createdAt ?? new Date().toISOString(),
  };
}



// Fetch reviews for a product with pagination — used on the product details page and reviews page
export async function fetchReviews(productId: string, page = 1, limit = 10): Promise<ReviewsResponse> {
  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));

  return request<ReviewsResponse>(`/api/products/${productId}/reviews?${query}`);
  
}


// Create a new review for a product — called from the review form on the product details page
export async function createReview(data: FormData, token?: string): Promise<Review> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const productId = data.get("product");

  const res = await fetch(`${API_BASE}/api/products/${productId}/reviews`, {
    method: "POST",
    headers,
    credentials: "include",
    body: data,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create review");
  }

  return res.json();
}



// ─── Wishlist ─────────────────────────────────────────────────────────────────
// Fetch the user's wishlist items — returns full product objects, not just IDs
export async function fetchWishlist(token: string): Promise<Product[]> { 
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/wishlist`, {
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
    `${API_BASE}/api/wishlist/toggle/${productId}`,
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



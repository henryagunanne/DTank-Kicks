/*
  This file defines the /shop route which displays a list of products with filtering and sorting options. 
  It uses React Query to fetch products from the server based on the current search params in the URL, 
  and updates those params when filters are changed. The UI includes a sidebar for filters 
  (which becomes a drawer on mobile) and pagination controls.
*/

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ProductsResponse } from "@/lib/product-api";
import type { Product } from "@/lib/types";
import { ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { BRANDS } from "@/lib/data";
import { fetchProducts } from "@/lib/product-api";
import { ProductCardSkeleton, WishlistableCard } from "@/components/site/ProductCard";

interface ShopSearch {
  category?: string;
  brand?: string;
  size?: number;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sort?: "featured" | "price-asc" | "price-desc" | "newest" | "rated";
  page?: number;
}

export const Route = createFileRoute("/shop/")({
  // Validate and parse search params from the URL into the correct types for our UI and API calls
  validateSearch: (s: Record<string, unknown>): ShopSearch => ({
    category: typeof s.category === "string" ? s.category : undefined,
    brand: typeof s.brand === "string" ? s.brand : undefined,
    size: typeof s.size === "number" ? s.size : s.size ? Number(s.size) : undefined,
    color: typeof s.color === "string" ? s.color : undefined,
    minPrice: s.minPrice ? Number(s.minPrice) : undefined,
    maxPrice: s.maxPrice ? Number(s.maxPrice) : undefined,
    rating: s.rating ? Number(s.rating) : undefined,
    sort: (s.sort as ShopSearch["sort"]) ?? undefined,
    page: s.page ? Number(s.page) : undefined,
  }),
  component: ShopPage,
  head: () => ({
    meta: [
      { title: "Shop All Shoes — DTank-Kicks" },
      { name: "description", content: "Browse all shoes from Nike, Adidas, Puma, New Balance, Vans, Converse. Filter by category, brand, size, color and price." },
    ],
  }),
});

const CATEGORIES = ["Sneakers", "Boots", "Formal", "Sports", "Sandals"];
const ALL_COLORS = ["Black", "White", "Gray", "Red", "Blue", "Green", "Tan", "Brown", "Gold"];
const PAGE_SIZE = 9;

function ShopPage() {
  const search = Route.useSearch();
  const nav = Route.useNavigate();
  const [showFilters, setShowFilters] = useState(false);

  // When a filter changes, update the URL search params which automatically triggers a refetch with the new filters
  const set = (next: Partial<ShopSearch>) => nav({ search: (prev: ShopSearch) => ({ ...prev, ...next, page: 1 }) });

  // The server returns products based on the search params. We use React Query to manage caching and loading states.
  const page = search.page ?? 1;

  // Build query params for the server. The backend understands the same filter keys.
  const queryParams: Record<string, any> = { ...search, page, limit: PAGE_SIZE };
  
  
  const { data: productsRes, isLoading: loading } = useQuery<ProductsResponse, Error>({
    queryKey: ["products", queryParams],
    queryFn: () => fetchProducts(queryParams),
    staleTime: 1000 * 60 * 2,
  });

  // Extract products and pagination info from the server response, with fallbacks for loading states
  const products: Product[] = productsRes?.items ?? [];
  const total = productsRes?.total ?? 0;
  const totalPages = productsRes?.pages ?? Math.max(1, Math.ceil(total / PAGE_SIZE));

  // UI for the filters sidebar. On mobile, this is rendered in a drawer when the "Filters" button is clicked.
  const FilterBlock = (
    <aside className="space-y-7 text-sm">
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest">Category</h3>
        <div className="space-y-2">
          {CATEGORIES.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="cat" checked={search.category === c} onChange={() => set({ category: c })} className="accent-gold" />
              {c}
            </label>
          ))}
          {search.category && <button onClick={() => set({ category: undefined })} className="text-xs text-muted-foreground underline">Clear</button>}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest">Brand</h3>
        <div className="space-y-2">
          {BRANDS.map((b) => (
            <label key={b} className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={search.brand === b} onChange={() => set({ brand: search.brand === b ? undefined : b })} className="accent-gold" />
              {b}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest">Size (UK)</h3>
        <div className="grid grid-cols-4 gap-2">
          {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((s) => (
            <button key={s} onClick={() => set({ size: search.size === s ? undefined : s })}
              className={`rounded-md border py-1.5 text-xs ${search.size === s ? "border-gold bg-gold/10 font-semibold" : "border-border"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest">Color</h3>
        <div className="flex flex-wrap gap-2">
          {ALL_COLORS.map((c) => {
            const hex: Record<string, string> = { Black: "#111", White: "#f5f5f5", Gray: "#9ca3af", Red: "#dc2626", Blue: "#1e40af", Green: "#15803d", Tan: "#b08968", Brown: "#6b3a18", Gold: "#d4af37" };
            return (
              <button
                key={c}
                onClick={() => set({ color: search.color === c ? undefined : c })}
                title={c}
                className={`h-7 w-7 rounded-full border-2 p-0 ${search.color === c ? "border-gold ring-2 ring-gold/40" : "border-border"}`}>
                <svg className="h-7 w-7 rounded-full" viewBox="0 0 24 24" role="img" aria-label={c}>
                  <circle cx="12" cy="12" r="12" fill={hex[c]} />
                </svg>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest">Price (₱)</h3>
        <div className="flex gap-2">
          <input type="number" placeholder="Min" defaultValue={search.minPrice ?? ""} onBlur={(e) => set({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" />
          <input type="number" placeholder="Max" defaultValue={search.maxPrice ?? ""} onBlur={(e) => set({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" />
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest">Rating</h3>
        <div className="space-y-1">
          {[4, 3, 2].map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 text-xs">
              <input type="radio" name="rating" checked={search.rating === r} onChange={() => set({ rating: r })} className="accent-gold" />
              <span className="text-gold">{"★".repeat(r)}</span><span className="text-muted-foreground">{"★".repeat(5 - r)}</span>
              <span>& up</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

      <nav className="mb-6 flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link><ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Shop{search.category ? ` / ${search.category}` : ""}</span>
      </nav>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{search.category ?? "All Shoes"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} products</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(true)} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm lg:hidden">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
          <select aria-label="Sort products" value={search.sort} onChange={(e) => set({ sort: e.target.value as ShopSearch["sort"] })}
            className="rounded-full border border-input bg-background px-4 py-2 text-sm">
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="rated">Best Rated</option>
          </select>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <div className="hidden lg:block">{FilterBlock}</div>

        <div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 9 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products.map((p) => <WishlistableCard key={p.id} product={p} />)}
          </div>

          {total === 0 && (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
              No products match your filters.
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => nav({ search: (p: ShopSearch) => ({ ...p, page: i + 1 }) })}
                  className={`h-10 w-10 rounded-full text-sm font-semibold ${page === i + 1 ? "bg-primary text-primary-foreground" : "border border-border"}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filters drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-0 h-full w-80 overflow-y-auto bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Filters</h3>
              <button onClick={() => setShowFilters(false)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            {FilterBlock}
          </div>
        </div>
      )}
    </div>
  );
}

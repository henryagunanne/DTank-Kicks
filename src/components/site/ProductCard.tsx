import { Link } from "@tanstack/react-router";
import { Star, Plus, Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";
import { peso } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useWishlist } from "@/lib/wishlist-context";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [picker, setPicker] = useState(false);
  const avail = product.sizes.filter((s) => s.stock > 0);

  return (
    <div className="group relative flex flex-col">
      <Link to="/shop/$id" params={{ id: product.id }} className="hover-zoom relative block aspect-square overflow-hidden rounded-xl bg-secondary">
        <img src={product.images[0]} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        {product.isNew && <span className="absolute left-3 top-3 rounded-full bg-gold px-2 py-1 text-[10px] font-bold uppercase text-gold-foreground">New</span>}
        {product.compareAtPrice && <span className="absolute right-3 top-3 rounded-full bg-destructive px-2 py-1 text-[10px] font-bold text-destructive-foreground">Sale</span>}
      </Link>
      <button
        onClick={() => setPicker((p) => !p)}
        className="absolute right-3 top-[calc(100%-3.25rem)] -translate-y-full rounded-full bg-background p-2 opacity-0 shadow-md transition group-hover:opacity-100 hover:bg-gold hover:text-gold-foreground"
        aria-label="Quick add"
      >
        <Plus className="h-4 w-4" />
      </button>
      <div className="mt-3 flex flex-col">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{product.brand}</div>
        <Link to="/shop/$id" params={{ id: product.id }} className="text-sm font-semibold hover:underline">{product.name}</Link>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-gold text-gold" />
          {product.rating.toFixed(1)} <span>({product.reviewCount})</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-bold">{peso(product.price)}</span>
          {product.compareAtPrice && <span className="text-xs text-muted-foreground line-through">{peso(product.compareAtPrice)}</span>}
        </div>
        <div className="mt-2 flex gap-1.5">
          {product.colors.slice(0, 4).map((c) => (
            <span key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-full border border-border" style={{ background: c.hex }} />
          ))}
        </div>
      </div>

      {picker && (
        <div className="absolute inset-x-0 bottom-0 z-10 rounded-xl border border-border bg-popover p-3 shadow-xl">
          <div className="mb-2 text-xs font-semibold">Select size (UK)</div>
          <div className="grid grid-cols-6 gap-1">
            {avail.slice(0, 12).map((s) => (
              <button
                key={s.size}
                onClick={() => {
                  add({ productId: product.id, name: product.name, brand: product.brand, image: product.images[0], size: s.size, color: product.colors[0].name, quantity: 1, price: product.price });
                  toast.success(`Added UK ${s.size} to cart`);
                  setPicker(false);
                }}
                className="rounded-md border border-border py-1.5 text-xs hover:border-gold hover:bg-gold/10"
              >
                {s.size}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// A skeleton version of the ProductCard, used as a placeholder while loading real product data
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="aspect-square animate-pulse rounded-xl bg-secondary" />
      <div className="mt-3 h-3 w-16 animate-pulse rounded bg-secondary" />
      <div className="mt-2 h-4 w-40 animate-pulse rounded bg-secondary" />
      <div className="mt-2 h-4 w-20 animate-pulse rounded bg-secondary" />
    </div>
  );
}


// ─── WishlistableCard ─────────────────────────────────────────────────────────
// Wraps ProductCard with a heart button overlay.
// Only shows the heart to logged-in users — guests see the plain card.
export function WishlistableCard({ product }: { product: Product }) {
  const { user } = useAuth();
  const { has, toggle } = useWishlist();
  const wished = has(product.id);

  return (
    <div className="relative">
      <ProductCard product={product} />

      {/* Heart overlay — only visible when user is logged in */}
      {user && (
        <button
          onClick={(e) => {
            // Stop propagation so we don't also navigate to the product page
            e.preventDefault();
            e.stopPropagation();
            toggle(product.id);
          }}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-all hover:scale-110 ${
            wished
              ? "border-red-300 bg-white text-red-500"
              : "border-border bg-white/80 text-muted-foreground hover:text-red-500 backdrop-blur"
          }`}
        >
          <Heart
            className="h-4 w-4"
            fill={wished ? "currentColor" : "none"}
          />
        </button>
      )}
    </div>
  );
}



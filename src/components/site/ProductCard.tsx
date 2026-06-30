import { Link } from "@tanstack/react-router";
import { Star, Plus, Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";
import { peso } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useWishlist } from "@/lib/wishlist-context";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const cardRef = useRef<HTMLDivElement>(null);
  const [picker, setPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]?.name ?? "");
  const [selectedSize, setSelectedSize] = useState<number | null>(null);


  // const avail = (product.sizes ?? []).filter((s) => s.stock > 0);
  const colors = product.colors ?? [];
  
  const selectedVariant = product.variants.find(
    v =>
      v.color.name === selectedColor &&
      v.size === selectedSize &&
      v.stock > 0
  );

  // If no variant is selected yet, try to find the first available one to show the correct price and "Sale" badge if applicable. 
  // This ensures that the card displays accurate information even before the user interacts with the picker.
  const variant = selectedVariant || product.variants?.find(v => v.stock > 0) || product.variants?.[0];

  const availableSizes = product.variants.filter(
    v => v.color.name === selectedColor
  );

  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        picker &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node)
      ) {
        setPicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [picker]);

  // Helper function to determine the correct image source URL, handling both absolute URLs and relative paths from the server
  const getImageSrc = (img: string) => {
    if (img.startsWith("http")) {
      return img;
    } else if (img.startsWith("/uploads")) {
      return `${API_BASE}${img}`;
    } else {
      return img;
    }
  };

  return (
    <div ref={cardRef} className="group relative flex flex-col">
      <Link to="/shop/$id" params={{ id: product.id }} className="hover-zoom relative block aspect-square overflow-hidden rounded-xl bg-secondary">
        <img src={getImageSrc(product.images[0])} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        {product.isNew && <span className="absolute left-3 top-3 rounded-full bg-gold px-2 py-1 text-[10px] font-bold uppercase text-gold-foreground">New</span>}
        {variant?.compareAtPrice && <span className="absolute right-3 top-3 rounded-full bg-destructive px-2 py-1 text-[10px] font-bold text-destructive-foreground">Sale</span>}
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
          <span className="text-sm font-bold">{peso(product.minPrice)}</span>
          {variant?.compareAtPrice && <span className="text-xs text-muted-foreground line-through">{peso(variant.compareAtPrice)}</span>}
        </div>
        <div className="mt-2 flex gap-1.5">
          {colors.slice(0, 4).map((c) => (
            <span key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-full border border-border" style={{ background: c.hex }} />
          ))}
        </div>
      </div>

      {picker && (
        <div className="absolute inset-x-0 bottom-0 z-10 rounded-xl border border-border bg-popover p-3 shadow-xl">
          <div className="mb-2 text-xs font-semibold">Select color</div>
          <div className="flex gap-2 mb-3">
            {colors.map((c) => (
              <button type="button" aria-label={c.name}
                key={c.name}
                onClick={() => setSelectedColor(c.name)}
                className={`h-6 w-6 rounded-full border ${
                  selectedColor === c.name ? "ring-2 ring-gold" : ""
                }`}
                style={{ background: c.hex }}
              />
            ))}
          </div>
          <div className="mb-2 text-xs font-semibold">Select size (UK)</div>
          <div className="grid grid-cols-6 gap-1">
            {availableSizes.map(v => (
              <button type="button"
                key={`${v.size}-${v.color.name}`}
                disabled={v.stock === 0}
                onClick={() => { 
                  setSelectedSize(v.size);
                  add({ productId: product.id, variantId: v.id, name: product.name, brand: product.brand, image: product.images[0],  quantity: 1, priceAtAdd: v.price, size: v.size, color: v.color.name });
                  toast.success(`Added ${product.name} ${v.color.name} UK ${v.size} to cart`);
                  setPicker(false);
                }}
                className="rounded-md border border-border py-1.5 text-xs hover:border-gold hover:bg-gold/10"
              >
                {v.size}
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
            if (wished) {
              toast.success(`Removed ${product.name} from wishlist`);
            } else {
              toast.success(`Added ${product.name} to wishlist`);
            }
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



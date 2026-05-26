import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Heart, Minus, Plus, Star, Truck, RotateCcw, ShieldCheck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PRODUCTS, REVIEWS, getProduct } from "@/lib/data";
import type { Product } from "@/lib/types";
import { peso } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { SizeGuideButton } from "@/components/site/SizeGuideModal";
import { ProductCard } from "@/components/site/ProductCard";
import { pushRecent, useRecent } from "@/lib/recently-viewed";
import { StarInput } from "@/components/site/StarInput";

export const Route = createFileRoute("/shop/$id")({
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    return { product };
  },
  component: ProductPage,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.brand} ${loaderData.product.name} — SoleStore` },
          { name: "description", content: loaderData.product.description.slice(0, 155) },
          { property: "og:title", content: `${loaderData.product.brand} ${loaderData.product.name}` },
          { property: "og:image", content: loaderData.product.images[0] },
        ]
      : [{ title: "Product — SoleStore" }],
  }),
});

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: Product };
  const { add } = useCart();
  const [imageIdx, setImageIdx] = useState(0);
  const [color, setColor] = useState(product.colors[0].name);
  const [size, setSize] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"desc" | "size" | "ship" | "rev">("desc");
  const [wished, setWished] = useState(false);

  useEffect(() => { pushRecent(product); }, [product]);

  const reviews = REVIEWS.filter((r) => r.productId === product.id);
  const related = PRODUCTS.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);
  const recentIds = useRecent().filter((id) => id !== product.id);
  const recent = useMemo(() => recentIds.map((id) => PRODUCTS.find((p) => p.id === id)!).filter(Boolean).slice(0, 4), [recentIds]);

  const onAdd = () => {
    if (!size) { toast.error("Please select a size"); return; }
    add({ productId: product.id, name: product.name, brand: product.brand, image: product.images[0], size, color, quantity: qty, price: product.price });
    toast.success(`${product.name} (UK ${size}) added to cart`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link><ChevronRight className="h-3 w-3" />
        <Link to="/shop" search={{}} className="hover:text-foreground">Shop</Link><ChevronRight className="h-3 w-3" />
        <Link to="/shop" search={{ category: product.category }} className="hover:text-foreground">{product.category}</Link><ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="hover-zoom group relative aspect-square overflow-hidden rounded-2xl bg-secondary">
            <img src={product.images[imageIdx]} alt={product.name} className="h-full w-full object-cover" />
            <button className="absolute bottom-4 right-4 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold shadow">360° View</button>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {product.images.map((src, i) => (
              <button key={i} onClick={() => setImageIdx(i)}
                className={`aspect-square overflow-hidden rounded-lg border-2 ${imageIdx === i ? "border-gold" : "border-transparent"}`}>
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{product.brand}</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-gold text-gold" />
              <span className="font-semibold">{product.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({product.reviewCount} reviews)</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-black">{peso(product.price)}</span>
            {product.compareAtPrice && <span className="text-lg text-muted-foreground line-through">{peso(product.compareAtPrice)}</span>}
          </div>

          <div className="mt-7">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest">Color: <span className="text-muted-foreground">{color}</span></div>
            <div className="flex gap-2">
              {product.colors.map((c) => (
                <button key={c.name} title={c.name} onClick={() => setColor(c.name)}
                  className={`h-9 w-9 rounded-full border-2 ${color === c.name ? "border-gold ring-2 ring-gold/40" : "border-border"}`}
                  style={{ background: c.hex }} />
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-widest">Size (UK)</div>
              <SizeGuideButton />
            </div>
            <div className="grid grid-cols-6 gap-2">
              {product.sizes.map((s) => {
                const oos = s.stock === 0;
                return (
                  <button key={s.size} disabled={oos} onClick={() => setSize(s.size)}
                    className={`h-12 rounded-md border text-sm font-semibold ${
                      size === s.size ? "border-gold bg-gold text-gold-foreground"
                      : oos ? "cursor-not-allowed border-border text-muted-foreground line-through opacity-50"
                      : "border-border hover:border-gold"}`}>
                    {s.size}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-7 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center text-sm font-bold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="p-3"><Plus className="h-4 w-4" /></button>
            </div>
            <button onClick={onAdd} className="flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90">
              Add to Cart
            </button>
            <button onClick={() => { setWished(!wished); toast.success(wished ? "Removed from wishlist" : "Added to wishlist"); }}
              className={`rounded-full border border-border p-3.5 ${wished ? "bg-destructive/10 text-destructive border-destructive/40" : ""}`}>
              <Heart className={`h-5 w-5 ${wished ? "fill-current" : ""}`} />
            </button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 rounded-xl border border-border p-4 text-xs">
            <div className="flex flex-col items-center gap-1 text-center"><Truck className="h-5 w-5 text-gold" /><div className="font-semibold">Free Shipping</div><div className="text-muted-foreground">over ₱2,000</div></div>
            <div className="flex flex-col items-center gap-1 text-center"><RotateCcw className="h-5 w-5 text-gold" /><div className="font-semibold">30-day Returns</div><div className="text-muted-foreground">no questions</div></div>
            <div className="flex flex-col items-center gap-1 text-center"><ShieldCheck className="h-5 w-5 text-gold" /><div className="font-semibold">Authentic</div><div className="text-muted-foreground">100% guarantee</div></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-20 border-t border-border">
        <div className="flex flex-wrap gap-1 border-b border-border">
          {([["desc", "Description"], ["size", "Size & Fit"], ["ship", "Delivery & Returns"], ["rev", `Reviews (${reviews.length})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`border-b-2 px-5 py-4 text-sm font-semibold ${tab === k ? "border-gold text-foreground" : "border-transparent text-muted-foreground"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="py-8 text-sm leading-7 text-muted-foreground max-w-3xl">
          {tab === "desc" && <p>{product.description}</p>}
          {tab === "size" && <p>This style fits true to size. If you're between sizes, we recommend going up half a size for a relaxed fit.</p>}
          {tab === "ship" && <p>Standard shipping (3–5 days) is ₱150, free over ₱2,000. Express (1–2 days) is ₱350. Free returns within 30 days of delivery.</p>}
          {tab === "rev" && (
            <div className="space-y-8">
              <ReviewForm productId={product.id} />
              <div className="space-y-6">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-foreground">{r.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">by {r.userName}{r.verifiedPurchase && " • Verified buyer"}</div>
                      </div>
                      <div className="text-gold">{"★".repeat(r.rating)}<span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span></div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{r.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      <section className="mt-16">
        <h2 className="mb-8 text-2xl font-black tracking-tight">You might also like</h2>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {related.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-8 text-2xl font-black tracking-tight">Recently viewed</h2>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {recent.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); toast.success("Review submitted (demo)"); setTitle(""); setBody(""); }}
      className="rounded-xl border border-border p-5"
    >
      <h3 className="text-sm font-bold text-foreground">Write a review</h3>
      <div className="mt-3 text-xs text-muted-foreground">Only verified buyers can submit reviews. (Demo mode — anyone can.)</div>
      <div className="mt-3"><StarInput value={rating} onChange={setRating} /></div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required maxLength={100} className="mt-3 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your review..." required maxLength={1000} rows={4} className="mt-2 w-full rounded-md border border-input bg-background p-3 text-sm" />
      <input type="file" accept="image/*" className="mt-2 text-xs" />
      <button className="mt-3 rounded-full bg-primary px-5 py-2 text-xs font-bold uppercase text-primary-foreground" data-product={productId}>Submit Review</button>
    </form>
  );
}

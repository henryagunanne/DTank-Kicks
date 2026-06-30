/*
  This file defines the /shop/$id route which displays the product details page for a specific product. 
  It uses the loader function to fetch the product data based on the ID in the URL, and renders a detailed view of the product including images, description, reviews, and related products. 
  The component also allows users to select options like color and size, add the product to their cart, and submit reviews.
*/

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Minus, Plus, Star, Truck, RotateCcw, ShieldCheck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { fetchProductById, fetchProducts, fetchProductsByIds, fetchReviews, createReview } from "@/lib/product-api";
import type { Product, Review } from "@/lib/types";
import { peso } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useWishlist } from "@/lib/wishlist-context";
import { SizeGuideButton } from "@/components/site/SizeGuideModal";
import { WishlistableCard } from "@/components/site/ProductCard";
import { pushRecent, useRecent } from "@/lib/recently-viewed";
import { StarInput } from "@/components/site/StarInput";

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000";

export const Route = createFileRoute("/shop/$id")({
  loader: async ({ params }) => {
    const product = await fetchProductById(params.id);
    if (!product) throw notFound();
    return { product };
  },
  component: ProductPage,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.brand} ${loaderData.product.name} — DTank-Kicks` },
          { name: "description", content: loaderData.product.description.slice(0, 155) },
          { property: "og:title", content: `${loaderData.product.brand} ${loaderData.product.name}` },
          { property: "og:image", content: loaderData.product.images[0] ?? "" },
        ]
      : [{ title: "Product — DTank-Kicks" }],
  }),
});

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: Product };
  const { add } = useCart();
  const { user } = useAuth();
  const { has, toggle } = useWishlist();
  const [imageIdx, setImageIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.name ?? "");
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"desc" | "size" | "ship" | "rev">("desc");

  // Determine the currently selected variant based on the selected color and size. 
  // This is used to display the correct price and check stock availability.
  const selectedVariant = product.variants.find(v => v.color.name === selectedColor && v.size === selectedSize);

  // Get available sizes for the currently selected color to disable unavailable options in the size selector.
  const availableSizes = product.variants.filter( v => v.color.name === selectedColor);

  // Whenever the product changes (i.e. when navigating to a different product page), we push it to the recently viewed list in localStorage.
  useEffect(() => { pushRecent(product); }, [product]);

  // Fetch reviews for this product. We show the first 10 reviews here and link to a separate reviews page if there are more.
  const { data: reviewData } = useQuery<{ items: Review[]; total: number; page: number; pages: number }, Error>({
    queryKey: ["product-reviews", product.id],
    queryFn: () => fetchReviews(product.id, 1, 10),
    staleTime: 1000 * 60 * 2,
  });

  const reviews = reviewData?.items ?? [];
  const reviewTotal = reviewData?.total ?? product.reviewCount;

  // Fetch related products from the same category to show in the "You may also like" section. We exclude the current product from this list.
  const { data: relatedData = { items: [] } } = useQuery({
    queryKey: ["related-products", product.category],
    queryFn: () => fetchProducts({ category: product.category, limit: 8, sort: "newest" }),
    enabled: !!product.category,
    staleTime: 1000 * 60 * 5,
  });

  const related = relatedData.items.filter((p) => p.id !== product.id).slice(0, 4);

  // Fetch recently viewed products, excluding the current product. This is stored in localStorage and managed via the useRecent hook.
  const recentIds = useRecent().filter((id) => id !== product.id);
  const { data: recent = [] } = useQuery({
    queryKey: ["recent-products", recentIds],
    queryFn: () => fetchProductsByIds(recentIds),
    enabled: recentIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  const wished = user ? has(product.id) : false;
  const selectedVariantStock = selectedVariant?.stock ?? 0;
  const canIncreaseQty = Boolean(selectedVariant) && qty < selectedVariantStock;
  const showLowStock = selectedVariantStock > 0 && selectedVariantStock < 10;

  const onAdd = () => {
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    if (!selectedVariant) {
      toast.error("Selected variant is unavailable");
      return;
    }
    if (qty > selectedVariantStock) {
      toast.error(`Only ${selectedVariantStock} item${selectedVariantStock === 1 ? "" : "s"} in stock for this size.`);
      return;
    }
    add({ productId: product.id, variantId: selectedVariant.id, name: product.name, brand: product.brand, image: product.images[0], quantity: qty, priceAtAdd: selectedVariant.price, size: selectedVariant.size, color: selectedVariant.color.name });
    toast.success(`${product.name} (UK ${selectedSize}) added to cart`);
  };

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
            <img src={getImageSrc(product.images[imageIdx])} alt={product.name} className="h-full w-full object-cover" />
            <button className="absolute bottom-4 right-4 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold shadow">360° View</button>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {product.images.map((src, i) => (
              <button key={i} aria-label={`View image ${i + 1}`} onClick={() => setImageIdx(i)}
                className={`aspect-square overflow-hidden rounded-lg border-2 ${imageIdx === i ? "border-gold" : "border-transparent"}`}>
                <img src={getImageSrc(src)} alt={`Thumbnail ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
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
            <span className="text-3xl font-black">
              {selectedVariant ? peso(selectedVariant.price) : peso(Math.min(...product.variants.map(v => v.price)))}   
              </span>
            {selectedVariant?.compareAtPrice && <span className="text-lg text-muted-foreground line-through">{peso(selectedVariant.compareAtPrice)}</span>}
          </div>

          <div className="mt-7">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest">Color: <span className="text-muted-foreground">{selectedColor}</span></div>
            <div className="flex gap-2">
              {product.colors.map((c) => (
                <button key={c.name} title={c.name} aria-label={`Select ${c.name}`} onClick={() => setSelectedColor(c.name)}
                  className={`h-9 w-9 rounded-full border-2 p-0 ${selectedColor === c.name ? "border-gold ring-2 ring-gold/40" : "border-border"}`}>
                  <svg className="h-9 w-9 rounded-full" viewBox="0 0 24 24" role="img" aria-label={c.name}>
                    <circle cx="12" cy="12" r="12" fill={c.hex} />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-widest">Size (UK)</div>
              <SizeGuideButton />
            </div>
            <div className="grid grid-cols-6 gap-2">
              {availableSizes.map(v => (
                  <button key={v.size} disabled={v.stock === 0} onClick={() => setSelectedSize(v.size)}
                    className={`h-12 rounded-md border text-sm font-semibold ${selectedSize === v.size ? "border-gold bg-gold text-gold-foreground"
                      : v.stock === 0 ? "cursor-not-allowed border-border text-muted-foreground line-through opacity-50"
                      : "border-border hover:border-gold"}`}>
                    {v.size}
                  </button>
              ))}
            </div>
          </div>

          <div className="mt-7 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-full border border-border">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  aria-label="Decrease quantity"
                  className="p-3"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-bold">{qty}</span>
                <button
                  onClick={() => {
                    if (!selectedSize) return;
                    setQty((current) => Math.min(selectedVariantStock, current + 1));
                  }}
                  aria-label="Increase quantity"
                  className="p-3"
                  disabled={!selectedSize || !canIncreaseQty}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={onAdd}
                disabled={!selectedSize || !selectedVariant || qty === 0 || qty > selectedVariantStock}
                className="flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add to Cart
              </button>
              {user && (
                <button
                  aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                  onClick={() => {
                    toggle(product.id);
                    toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
                  }}
                  className={`h-12 w-12 shrink-0 rounded-full border border-border flex items-center justify-center transition ${wished ? "bg-destructive/10 text-destructive border-destructive/40" : "bg-background text-muted-foreground hover:border-gold"}`}
                >
                  <Heart className={`h-5 w-5 ${wished ? "fill-current" : ""}`} />
                </button>
              )}
            </div>
            {selectedSize && selectedVariant && showLowStock ? (
              <p className="text-sm text-red-500">Only {selectedVariantStock} left in stock for this size.</p>
            ) : null}
            {selectedSize && !selectedVariant ? (
              <p className="text-sm text-red-500">This size is out of stock.</p>
            ) : null}
            {!selectedSize ? (
              <p className="text-sm text-red-500">Select a size before increasing quantity.</p>
            ) : null}
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
          {([["desc", "Description"], ["size", "Size & Fit"], ["ship", "Delivery & Returns"], ["rev", `Reviews (${reviewTotal})`]] as const).map(([k, l]) => (
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
         
            <div>
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-base font-bold text-foreground">
                  Customer reviews{reviewTotal ? ` (${reviewTotal})` : ""}
                </h3>
                {product.reviewCount > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-gold text-gold" />
                    <span className="font-semibold text-foreground">{product.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">/ 5</span>
                  </div>
                )}
              </div>

              {reviewData === undefined ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-secondary/40" />
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No reviews yet. Be the first to share your thoughts.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => {
                    const key = (r as any).id ?? (r as any)._id;
                    const userName =
                      (r as any).userName ?? (r as any).user?.name ?? "Anonymous";
                    const created = (r as any).createdAt
                      ? new Date((r as any).createdAt).toLocaleDateString(undefined, {
                          year: "numeric", month: "short", day: "numeric",
                        })
                      : null;
                    const images: string[] = (r as any).images ?? [];
                    return (
                      <article key={key} className="rounded-xl border border-border p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-bold text-foreground">{r.title}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              by {userName}
                              {r.verifiedPurchase && (
                                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
                                  <ShieldCheck className="h-3 w-3" /> Verified buyer
                                </span>
                              )}
                              {created && <span className="ml-2">• {created}</span>}
                            </div>
                          </div>
                          <div className="shrink-0 text-gold" aria-label={`${r.rating} out of 5 stars`}>
                            {"★".repeat(r.rating)}
                            <span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{r.body}</p>

                        {/*  If the review includes images, we display them in a grid below the review text. */}
                        {images.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {images.map((src, i) => {
                              const getImageSrc = (path: string) => {
                                // already absolute URL
                                if (path.startsWith("http")) return path;
                                // if the path is relative, we prefix it with the API base URL
                                return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
                              };

                              return (
                                <img
                                  key={i}
                                  src={getImageSrc(src)}
                                  alt={`Review image ${i + 1}`}
                                  loading="lazy"
                                  className="h-20 w-20 rounded-md object-cover"
                                />
                              );
                            })}
                          </div>
                        )}
                      </article>
                    );
                  })}

                  {reviewData && reviewData.pages > 1 && (
                    <div className="pt-2 text-center">
                      <Link
                        to="/shop/$id"
                        params={{ id: product.id }}
                        className="text-xs font-semibold uppercase tracking-wider text-gold hover:underline"
                      >
                        See all {reviewTotal} reviews →
                      </Link>
                    </div>
                  )}
                </div>
              )}
              </div>

              <ReviewForm productId={product.id} />
            </div>
            )}
          </div>
        </div>


      {/* Related */}
      <section className="mt-16">
        <h2 className="mb-8 text-2xl font-black tracking-tight">You might also like</h2>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {related.map((p) => (
            <WishlistableCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-8 text-2xl font-black tracking-tight">Recently viewed</h2>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {recent.map((p) => (
              <WishlistableCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}


// Review form component used on the product details page. 
// It allows users to submit a rating, title, body, and optional image for their review.
function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const { accessToken } = useAuth();

  const queryClient = useQueryClient();

  // We use a mutation here because we're sending a POST request to create a new review, 
  // and we want to handle the loading and error states of that request.
  const mutation = useMutation({
    mutationFn: (data: FormData) => createReview(data, accessToken ?? undefined),
    onSuccess: () => {
      toast.success("Review submitted");

      // reset form
      setTitle("");
      setBody("");
      setRating(5);
      setImages([]);

      // refresh reviews
      queryClient.invalidateQueries({
        queryKey: ["product-reviews", productId],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // When the form is submitted, we gather the data into a FormData object and call 
  // mutation.mutate to trigger the createReview function.
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append("product", productId);
    formData.append("rating", String(rating));
    formData.append("title", title);
    formData.append("body", body);

    images.forEach((file) => {
      formData.append("images", file);
    });


    mutation.mutate(formData);
  };
  
  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border p-5">
      <h3 className="text-sm font-bold text-foreground">Write a review</h3>
      <div className="mt-3 text-xs text-muted-foreground">You must be logged in to submit a review</div>
      <div className="mt-3"><StarInput value={rating} onChange={setRating} /></div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required maxLength={100} className="mt-3 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your review..." required maxLength={1000} rows={4} className="mt-2 w-full rounded-md border border-input bg-background p-3 text-sm" />
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          setImages(files.slice(0, 4));
        }}
        aria-label="Upload review image" 
        className="mt-2 text-xs"
      />
      <button type="submit" disabled={mutation.isPending} className="mt-3 rounded-full bg-primary px-5 py-2 text-xs font-bold uppercase text-primary-foreground" data-product={productId}>
        {mutation.isPending ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}

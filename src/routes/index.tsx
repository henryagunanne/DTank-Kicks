/*
  This file defines the main landing page for the DTank-Kicks website. 
  It features a hero section with a background image and call-to-action, 
  followed by sections for shopping by category, new arrivals, a brand marquee, 
  and a newsletter signup form. The page is designed to be visually engaging and user-friendly,  
  encouraging visitors to explore the product offerings.
  The component uses the Link component from @tanstack/react-router for navigation and the 
  ArrowRight icon from lucide-react for visual enhancement. It also imports data for categories and products, 
  as well as a ProductCard component for displaying individual products and a BrandMarquee component for 
  showcasing brand logos.
*/

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";


import { CATEGORIES } from "@/lib/data";
import { fetchNewArrivals, fetchProductsByIds, fetchProductsByBrand } from "@/lib/product-api";
import { useRecent } from "@/lib/recently-viewed";
import { ProductCardSkeleton, WishlistableCard } from "@/components/site/ProductCard";
import { BrandMarquee } from "@/components/site/Marquee";



// ─── Route ────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "DTank-Kicks — Premium Footwear from the world's best brands" },
      { name: "description", content: "Shop sneakers, boots, formal, sports and sandals from Nike, Adidas, Puma and more." },
    ],
  }),
});


// ─── Brand config — logo colours and images for the "Shop by Brand" section ──

const BRANDS = [
  {
    name: "Nike",
    color: "#111",
    textColor: "#fff",
    img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Adidas",
    color: "#fff",
    textColor: "#111",
    img: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Puma",
    color: "#e31e24",
    textColor: "#fff",
    img: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "New Balance",
    color: "#cf3338",
    textColor: "#fff",
    img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Vans",
    color: "#1a1a1a",
    textColor: "#fff",
    img: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Converse",
    color: "#e8e8e8",
    textColor: "#111",
    img: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=600&q=80",
  },
] as const;


// ─── Page Component ───────────────────────────────────────────────────────────
function HomePage() {
  // New arrivals from DB
  const {
    data: newArrivals = [],
    isLoading: arrivalsLoading,
  } = useQuery({
    queryKey: ["new-arrivals"],
    queryFn: () => fetchNewArrivals(8),
    staleTime: 1000 * 60 * 5, // cache for 5 minutes
  });

    // Recently viewed products — we store an array of product IDs in localStorage, and fetch the full product data for those IDs
    // useRecent() returns an array of product IDs from localStorage
    // We then fetch the full product objects for those IDs
    const recentIds = useRecent();
    const { data: recentProducts = [] } = useQuery({
      queryKey: ["recent-products", recentIds],
      queryFn: () => fetchProductsByIds(recentIds),
      enabled: recentIds.length > 0, // don't fire if nothing viewed yet
      staleTime: 1000 * 60 * 2,
    });
  
    // Selected brand spotlight products
    const [activeBrand, setActiveBrand] = useState<(typeof BRANDS)[number]["name"]>(BRANDS[0].name);
    const { data: brandProducts = [], isLoading: brandLoading } = useQuery({
      queryKey: ["brand-products", activeBrand],
      queryFn: () => fetchProductsByBrand(activeBrand, 4),
      staleTime: 1000 * 60 * 5,
    });


  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=2000&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="relative mx-auto flex min-h-[80vh] max-w-7xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl text-white">
            <div className="mb-4 inline-block animate-pulse rounded-full bg-gold/90 px-3 py-1 text-xs font-bold uppercase tracking-widest text-gold-foreground">
              Fall Collection 2026
            </div>
            <h1 className="text-balance text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
              Step Into <span className="text-gold">Tomorrow.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-white/85">
              Every stitch engineered, every silhouette refined. Discover footwear built for the way you move.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" search={{}} className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-gold-foreground transition hover:scale-105">
                Shop Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/shop" search={{ category: "Sports" }} className="rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white backdrop-blur transition hover:bg-white/20">
                Sports
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Shop by Category</h2>
          <Link to="/shop" search={{}} className="text-sm font-semibold underline-offset-4 hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {CATEGORIES.map((c) => (
            <Link key={c.name} to="/shop" search={{ category: c.name }} className="hover-zoom group relative aspect-3/4 overflow-hidden rounded-2xl bg-secondary">
              <img src={c.img} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-4 left-4 text-lg font-bold text-white">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-gold">Just Dropped</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">New Arrivals</h2>
          </div>
          <Link to="/shop" search={{ sort: "newest" }} className="text-sm font-semibold underline-offset-4 hover:underline">See all →</Link>
        </div>
    
        {arrivalsLoading ? (
          // Skeleton grid while loading
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {newArrivals.map((p) => (
              <WishlistableCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Shop by Brand */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-widest text-gold">Explore</div>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Shop by Brand</h2>
        </div>

        {/* Brand selector pills */}
        <div className="flex flex-wrap gap-3">
          {BRANDS.map((b) => (
            <button
              key={b.name}
              onClick={() => setActiveBrand(b.name)}
              className={`rounded-full border-2 px-5 py-2 text-sm font-bold transition-all ${
                activeBrand === b.name ? "border-gold bg-gold text-gold-foreground scale-105" : "border-border hover:border-gold"}`}
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Brand hero banner */}
        {(() => {
          const brand = BRANDS.find((b) => b.name === activeBrand)!;
          return (
            <div className="mt-8 relative h-48 overflow-hidden rounded-2xl flex items-center px-10" style={{ backgroundColor: brand.color }}>
              <img src={brand.img} alt={brand.name} className="absolute inset-0 h-full w-full object-cover opacity-30"/>
              <div className="relative">
                <div className="text-4xl font-black tracking-tighter" style={{ color: brand.textColor }}>
                  {brand.name}
                </div>
                <Link
                  to="/shop"
                  search={{ brand: activeBrand }}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-bold opacity-80 hover:opacity-100"
                  style={{ color: brand.textColor }}
                >
                  Shop all {brand.name} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Brand product grid */}
        <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {brandLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))
            : brandProducts.map((p) => (
                <WishlistableCard key={p.id} product={p} />
              ))}
        </div>
      </section>

      {/* Recently Viewed */}
      {recentProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your History</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Recently Viewed</h2>
          </div>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {recentProducts.map((p) => (
              <WishlistableCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}


      <div className="mt-20"><BrandMarquee /></div>

      {/* Newsletter */}
      <section className="mx-auto my-24 max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-balance text-3xl font-black tracking-tight sm:text-4xl">Get 10% off your first order</h2>
        <p className="mt-3 text-muted-foreground">Sign up for early access, exclusive drops, and member-only deals.</p>
        <form className="mx-auto mt-8 flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); }}>
          <input type="email" required placeholder="you@email.com" className="h-12 flex-1 rounded-full border border-input bg-background px-5 text-sm outline-none focus:border-gold" />
          <button className="h-12 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90">Subscribe</button>
        </form>
      </section>
    </div>
  );
}



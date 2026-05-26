import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CATEGORIES, PRODUCTS } from "@/lib/data";
import { ProductCard } from "@/components/site/ProductCard";
import { BrandMarquee } from "@/components/site/Marquee";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "SoleStore — Premium Footwear from the world's best brands" },
      { name: "description", content: "Shop sneakers, boots, formal, sports and sandals from Nike, Adidas, Puma and more. Free shipping over ₱2,000." },
    ],
  }),
});

function HomePage() {
  const newArrivals = PRODUCTS.slice(0, 8);

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
            <Link key={c.name} to="/shop" search={{ category: c.name }} className="hover-zoom group relative aspect-[3/4] overflow-hidden rounded-2xl bg-secondary">
              <img src={c.img} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-4 left-4 text-lg font-bold text-white">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-widest text-gold">Just Dropped</div>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">New Arrivals</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

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

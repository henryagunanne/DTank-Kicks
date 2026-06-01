/*
  This is the header component for the DTank Kicks website. 
  It includes the site logo, navigation links, search bar with suggestions, 
  and icons for user account and shopping cart. The header is responsive, 
  with a mobile drawer menu on smaller screens. It also supports dark mode toggling.
*/

import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, User, Menu, Moon, Sun, X, Heart} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useCart } from "@/lib/cart-context";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useWishlist } from "@/lib/wishlist-context";
import { fetchProducts } from "@/lib/product-api";
import dtankDark from "@/assets/dtank-dark.svg";
import dtankWhite from "@/assets/dtank-white.svg";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export function Header() {
  const { count: cartCount } = useCart();
  const { dark, toggle } = useTheme();
  const { user } = useAuth();
  const { count: wishlistCount } = useWishlist();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Live search — queries the backend as the user types ──────────────────
  // Only fires when there are at least 2 characters typed
  const { data: searchData } = useQuery({
    queryKey: ["header-search", q],
    queryFn: () => fetchProducts({ q, limit: 10 }),
    enabled: q.trim().length >= 2,
    staleTime: 1000 * 30, // cache search results for 30 seconds
  });

  const suggestions = searchData?.items ?? [];

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.closest(".search-wrapper")?.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // construct the image source depending on whether the image file starts with "http" or "/uploads" (indicating it's a local file that needs the API base URL prefixed)
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
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">

        {/* Mobile menu button */}
        <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="h-6 w-6" /></button>

        {/* Logo */}
        <Link to="/" className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <img
            src={dark ? dtankWhite : dtankDark}
            alt="DTank KICKS"
            className="h-14 w-auto sm:h-26 lg:h-20"
            loading="lazy"
            decoding="async"
          />
          <span className="sr-only">DTank KICKS</span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-6 hidden gap-6 text-sm font-medium md:flex">
          <Link to="/shop" className="hover:text-gold" search={{}}>Shop</Link>
          <Link to="/shop" search={{ category: "Sneakers" }} className="hover:text-gold">Sneakers</Link>
          <Link to="/shop" search={{ category: "Boots" }} className="hover:text-gold">Boots</Link>
          <Link to="/shop" search={{ category: "Sports" }} className="hover:text-gold">Sports</Link>
        </nav>

        {/* Search — API-powered */}
        <div className="search-wrapper ml-auto hidden flex-1 max-w-md md:block relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search shoes, brands..."
            className="h-10 w-full rounded-full border border-input bg-secondary pl-9 pr-4 text-sm outline-none focus:border-gold"
          />
          {/* Search dropdown */}
          {focused && q.length >= 2 && (
            <div className="absolute left-0 right-0 top-12 rounded-xl border border-border bg-popover shadow-lg overflow-hidden z-50">
              {suggestions.length > 0 ? (
                suggestions.map((s) => (
                  <Link
                    key={s.id}
                    to="/shop/$id"
                    params={{ id: s.id }}
                    onClick={() => { setQ(""); setFocused(false); }}
                    className="flex items-center gap-3 p-3 hover:bg-secondary"
                  >
                    <img
                      src={getImageSrc(s.images[0])}
                      alt={s.name}
                      loading="lazy"
                      className="h-10 w-10 rounded object-cover"
                    />
                    <div>
                      <div className="text-xs text-muted-foreground">{s.brand}</div>
                      <div className="text-sm font-medium">{s.name}</div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No results for "{q}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right icons */}
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          {/* Dark/light toggle */}
          <button onClick={toggle} className="rounded-full p-2 hover:bg-secondary" aria-label="ToggleTheme">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Wishlist — only shown to logged-in users */}
          {user && (
            <Link to="/account" search={{ tab: "wishlist" } as never} className="relative rounded-full p-2 hover:bg-secondary" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>
          )}

          {/* Cart */}
          <Link to="/cart" className="relative rounded-full p-2 hover:bg-secondary" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Account */}
          <Link to="/account" className="rounded-full p-2 hover:bg-secondary" aria-label="Account"><User className="h-5 w-5" /></Link>

        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close"><X className="h-6 w-6" /></button>
            </div>
            <nav className="mt-8 flex flex-col gap-4 text-base font-medium">
              <Link to="/shop" search={{}} onClick={() => setOpen(false)}>Shop All</Link>
              <Link to="/shop" search={{ category: "Sneakers" }} onClick={() => setOpen(false)}>Sneakers</Link>
              <Link to="/shop" search={{ category: "Boots" }} onClick={() => setOpen(false)}>Boots</Link>
              <Link to="/shop" search={{ category: "Formal" }} onClick={() => setOpen(false)}>Formal</Link>
              <Link to="/shop" search={{ category: "Sports" }} onClick={() => setOpen(false)}>Sports</Link>
              <Link to="/shop" search={{ category: "Sandals" }} onClick={() => setOpen(false)}>Sandals</Link>
              <hr className="border-border" />
              <Link to="/account" onClick={() => setOpen(false)}>Account</Link>

              {/* Wishlist link in mobile drawer — only for logged-in users */}
              {user && (
                <Link to="/account" search={{ tab: "wishlist" } as never} onClick={() => setOpen(false)} className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  Wishlist
                  {wishlistCount > 0 && (
                    <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart link in mobile drawer */}
              <Link to="/cart" onClick={() => setOpen(false)} className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Cart
                {cartCount > 0 && (
                  <span className="ml-auto rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-gold-foreground">
                    {cartCount}
                  </span>
                  )}
              </Link>
              {/*<Link to="/cart" onClick={() => setOpen(false)}>Cart ({cartCount})</Link>*/}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

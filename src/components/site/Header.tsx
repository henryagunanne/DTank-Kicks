/*
  This is the header component for the DTank Kicks website. 
  It includes the site logo, navigation links, search bar with suggestions, 
  and icons for user account and shopping cart. The header is responsive, 
  with a mobile drawer menu on smaller screens. It also supports dark mode toggling.
*/

import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, User, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useTheme } from "@/lib/theme-context";
import { PRODUCTS } from "@/lib/data"; // TODO: Replace with real API data in a real app

export function Header() {
  const { count } = useCart();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  // TODO: In a real app, you'd fetch search suggestions from the server based on the query. Here we filter the static PRODUCTS list for simplicity.
  const suggestions = q.length > 1
    ? PRODUCTS.filter((p) => `${p.brand} ${p.name}`.toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    : [];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="h-6 w-6" /></button>

        <Link to="/" className="text-xl font-extrabold tracking-tight">
          DTANK<span className="text-gold">KICKS</span>
        </Link>

        <nav className="ml-6 hidden gap-6 text-sm font-medium md:flex">
          <Link to="/shop" className="hover:text-gold" search={{}}>Shop</Link>
          <Link to="/shop" search={{ category: "Sneakers" }} className="hover:text-gold">Sneakers</Link>
          <Link to="/shop" search={{ category: "Boots" }} className="hover:text-gold">Boots</Link>
          <Link to="/shop" search={{ category: "Sports" }} className="hover:text-gold">Sports</Link>
        </nav>

        <div className="ml-auto hidden flex-1 max-w-md md:block relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search shoes, brands..."
            className="h-10 w-full rounded-full border border-input bg-secondary pl-9 pr-4 text-sm outline-none focus:border-gold"
          />
          {focused && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-12 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
              {suggestions.map((s) => (
                <Link key={s.id} to="/shop/$id" params={{ id: s.id }} className="flex items-center gap-3 p-3 hover:bg-secondary">
                  <img src={s.images[0]} alt={s.name} loading="lazy" className="h-10 w-10 rounded object-cover" />
                  <div>
                    <div className="text-xs text-muted-foreground">{s.brand}</div>
                    <div className="text-sm font-medium">{s.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <button onClick={toggle} className="rounded-full p-2 hover:bg-secondary" aria-label="Theme">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link to="/account" className="rounded-full p-2 hover:bg-secondary" aria-label="Account"><User className="h-5 w-5" /></Link>
          <Link to="/cart" className="relative rounded-full p-2 hover:bg-secondary" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
                {count}
              </span>
            )}
          </Link>
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
              <Link to="/account" onClick={() => setOpen(false)}>Account</Link>
              <Link to="/cart" onClick={() => setOpen(false)}>Cart ({count})</Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

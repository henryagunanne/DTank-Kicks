
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { fetchWishlist, fetchOrders } from "@/lib/api";

import { WishlistableCard } from "@/components/site/ProductCard";

import { peso } from "@/lib/format";

interface AccountSearch {
  tab?: "profile" | "orders" | "wishlist" | "security";
}

export const Route = createFileRoute("/account")({
  // The validateSearch function ensures that the "tab" query parameter is one of the allowed values ("profile", "orders", "wishlist", or "security"). If it's not, it returns undefined, which will default to the "profile" tab in the component.
  validateSearch: (s: Record<string, unknown>): AccountSearch => ({
    tab: s.tab === "profile" || s.tab === "orders" || s.tab === "wishlist" || s.tab === "security"
      ? (s.tab as AccountSearch["tab"])
      : undefined,
  }),
  component: AccountPage,
  head: () => ({ meta: [{ title: "My Account — DTank-Kicks" }] }),
});

function AccountPage() {
  const { user, logout } = useAuth();
  const nav = Route.useNavigate();
  const search = Route.useSearch();
  const [tab, setTab] = useState<"profile" | "orders" | "wishlist" | "security">(
    search.tab ?? "profile"
  );

  // For simplicity, we'll just use the first address as the primary one. 
  const primaryAddress = user?.addresses?.[0];
  const formattedAddress = primaryAddress
    ? [primaryAddress.line1, primaryAddress.city, primaryAddress.province, primaryAddress.country, primaryAddress.postalCode]
        .filter(Boolean)
        .join(", ")
    : "";

  useEffect(() => { if (user === null) {/* allow guests to see prompt */} }, [user]);

  // Sync tab state with URL query parameter
  useEffect(() => {
    setTab(search.tab ?? "profile");
  }, [search.tab]);

  // ─────────────────────────────────────────────
  // Wishlist Query
  // ─────────────────────────────────────────────

  const {
    data: wishlist = [],
    isLoading: wishlistLoading,
  } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => fetchWishlist(),
    enabled: !!user,
  });

  // ─────────────────────────────────────────────
  // Orders Query
  // ─────────────────────────────────────────────

  const {
    data: orders = [],
    isLoading: ordersLoading,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrders(),
    enabled: !!user,
  });

  {/* If the user is not logged in, show a prompt to sign in. */}
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Sign in to access your account</h1>
        <Link to="/login" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase text-primary-foreground">Sign in</Link>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Hi, {user.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email} {user.role === "admin" && <Link to="/admin" className="ml-2 rounded bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-gold-foreground">Admin Panel</Link>}</p>
        </div>
        <button onClick={async () => { await logout(); nav({ to: "/" }); }} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 border-b border-border">
        {(["profile", "orders", "wishlist", "security"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              nav({ search: (prev) => ({ ...prev, tab: t }) });
            }}
            className={`border-b-2 px-4 py-3 text-sm font-semibold capitalize ${tab === t ? "border-gold" : "border-transparent text-muted-foreground"}`}>
            {t === "orders" ? "Order History" : t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-8">

        {/* Profile */}
        {tab === "profile" && (
          <form className="grid max-w-xl gap-4">
            {(["name", "email", "phone", "address"] as const).map((k) => (
              <label key={k} className="block">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{k}</div>
                <input
                  defaultValue={
                    k === "name"
                      ? user.name
                      : k === "email"
                      ? user.email
                      : k === "phone"
                      ? user.phone ?? primaryAddress?.phone ?? ""
                      : formattedAddress
                  }
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
            ))}
            <button type="button" className="w-fit rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">Save changes</button>
          </form>
        )}

        {/* Orders */}
        {tab === "orders" && (
          <>
            {ordersLoading ? (
              <div className="text-sm text-muted-foreground">Loading orders...</div>
            ) 
            : orders.length === 0 ? (
              <div className="rounded-xl border border-border p-8 text-center">
                <div className="font-semibold">No orders yet</div>
                <div className="mt-2 text-sm text-muted-foreground">Your order history will appear here.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between rounded-xl border border-border p-5">
                    <div>
                      <div className="font-bold">#{o.orderNumber || o.id}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}{" "}• {o.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{peso(o.total)}</div>
                      <button className="mt-1 text-xs underline text-muted-foreground">View Order</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Wishlist */}
        {tab === "wishlist" && (
          <>
            {wishlistLoading ? (
              <div className="text-sm text-muted-foreground">Loading wishlist...</div>
            ) : wishlist.length === 0 ? (
              <div className="rounded-xl border border-border p-8 text-center">
                <div className="font-semibold">Your wishlist is empty</div>
                <div className="mt-2 text-sm text-muted-foreground">Heart products to save them here.</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                {wishlist.map((p: any) => (
                  <WishlistableCard
                    key={p.id}
                    product={p}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Security */}
        {tab === "security" && (
          <form className="grid max-w-md gap-4">
            {["Current password", "New password", "Confirm new password"].map((l) => (
              <label key={l} className="block">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{l}</div>
                <input type="password" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" />
              </label>
            ))}
            <button type="button" className="w-fit rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">Update password</button>
          </form>
        )}
      </div>
    </div>
  );
}

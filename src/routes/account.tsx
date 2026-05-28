/*
  This file defines the AccountPage component, which is the main component for the /account route.
  It displays the user's profile information, order history, wishlist, and security settings.
  The component uses the useAuth hook to access the current user's information and authentication functions.
  It also uses useState to manage the active tab and useEffect to handle any side effects related to the user state.
*/


import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PRODUCTS } from "@/lib/data";
import { ProductCard } from "@/components/site/ProductCard";
import { peso } from "@/lib/format";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({ meta: [{ title: "My Account — DTank-Kicks" }] }),
});

function AccountPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"profile" | "orders" | "wishlist" | "security">("profile");

  const primaryAddress = user?.addresses?.[0];
  const formattedAddress = primaryAddress
    ? [primaryAddress.line1, primaryAddress.city, primaryAddress.province, primaryAddress.country, primaryAddress.postalCode]
        .filter(Boolean)
        .join(", ")
    : "";

  useEffect(() => { if (user === null) {/* allow guests to see prompt */} }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Sign in to access your account</h1>
        <Link to="/login" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase text-primary-foreground">Sign in</Link>
      </div>
    );
  }

  const orders = [
    { id: "SS-A12B34", date: "May 10, 2026", status: "Delivered", total: 9450 },
    { id: "SS-X88K22", date: "Mar 28, 2026", status: "Delivered", total: 4895 },
  ];

  const wishlist = PRODUCTS.slice(8, 12);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Hi, {user.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email} {user.role === "admin" && <Link to="/admin" className="ml-2 rounded bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-gold-foreground">Admin Panel</Link>}</p>
        </div>
        <button onClick={async () => { await logout(); nav({ to: "/" }); }} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      <div className="mt-8 flex gap-1 border-b border-border">
        {(["profile", "orders", "wishlist", "security"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`border-b-2 px-4 py-3 text-sm font-semibold capitalize ${tab === t ? "border-gold" : "border-transparent text-muted-foreground"}`}>
            {t === "orders" ? "Order History" : t}
          </button>
        ))}
      </div>

      <div className="mt-8">
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
        {tab === "orders" && (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-border p-5">
                <div>
                  <div className="font-bold">{o.id}</div>
                  <div className="text-xs text-muted-foreground">{o.date} • {o.status}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{peso(o.total)}</div>
                  <button className="mt-1 text-xs underline text-muted-foreground">Reorder</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "wishlist" && (
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {wishlist.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
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

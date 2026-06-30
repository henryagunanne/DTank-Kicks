/*
  This file defines the /account route which displays the user's account dashboard. 
  It includes tabs for profile info, order history, wishlist, and security settings. 
  The component fetches the user's orders and wishlist items using React Query, 
  and allows the user to log out or navigate to the admin panel if they have admin privileges.
*/

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { fetchOrders, cancelOrder } from "@/lib/order-api";
import { fetchWishlist } from "@/lib/product-api";

import { WishlistableCard } from "@/components/site/ProductCard";

import { peso } from "@/lib/format";
import { toast } from "sonner";

const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000"; // Fallback API base URL for client-side rendering
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
  const { user, logout, accessToken } = useAuth();
  const { add } = useCart();
  const nav = Route.useNavigate();
  const search = Route.useSearch();
  const [tab, setTab] = useState<"profile" | "orders" | "wishlist" | "security">(
    search.tab ?? "profile"
  );
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
    queryFn: () => fetchWishlist(accessToken || ""),
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
    queryFn: () => fetchOrders(accessToken || ""),
    enabled: !!user,
  });

  const qc = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: (orderId: string) => {
      setCancellingId(orderId);
      return cancelOrder(orderId, accessToken || "");
    },
    onSettled: () => {
      setCancellingId(null);
      toast.success(`Order cancelled`);
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
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

  // Helper function to get the correct image source URL, handling both absolute URLs and relative paths from the server. 
  // It also provides a fallback image if the URL is empty or invalid.
  const getImageSrc = (img: string) => {
    if (!img) return "/placeholder.jpg";

    if (img.startsWith("http")) return img;

    if (img.startsWith("/uploads")) {
      return `${API_BASE}${img}`;
    }

    return img;
  };

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
                {orders.map((o: any) => {
                  const expanded = expandedOrders[o._id || o.id];
                  const firstItem = o.items?.[0];
                  const remainingItems = expanded ? o.items?.slice(1) : [];
                
                  return (
                    <div key={o.id} className="rounded-xl border border-border p-5">
                      <div className="flex items-start justify-between gap-6">
                        {/* LEFT COLUMN */}
                        <div className="flex-1">
                          <div className="font-bold">#{o.orderNumber || o._id}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(o.createdAt).toLocaleDateString()}
                            {" • "}
                            {o.fulfillmentStatus}
                          </div>
                          
                          <div className="mt-4 space-y-3">
                            {/* First item always visible */}
                            {firstItem && (
                              <div key={firstItem.productId} className="flex items-center gap-3">
                                <img src={getImageSrc(firstItem.image)} alt={firstItem.name} className="h-14 w-14 rounded-md object-cover"/>
                                <div className="flex-1">
                                  <div className="font-medium">{firstItem.name}</div>
                                  <div className="text-xs text-muted-foreground">Qty: {firstItem.quantity}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Size: {firstItem.size} | {firstItem.color}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Remaining items */}
                            {remainingItems.map((item: any) => (
                              <div key={item.productId} className="flex items-center gap-3">
                                <img src={getImageSrc(item.image)} alt={item.name} className="h-14 w-14 rounded-md object-cover"/>
                                <div className="flex-1">
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">Qty: {item.quantity}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Size: {item.size} | {item.color}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {o.items?.length > 1 && (
                            <button
                              onClick={() =>
                                setExpandedOrders(prev => ({...prev, [o._id || o.id]: !prev[o._id || o.id]}))}
                              className="mt-2 text-xs font-medium text-gold hover:underline"
                            >
                              {expanded ? "Show less" : `View ${o.items.length - 1} more item${o.items.length > 2 ? "s" : ""}`}
                            </button>
                          )}
                        </div>
                        
                        {/* RIGHT COLUMN */}
                        <div className="flex min-w-[140px] flex-col items-end gap-2 text-right">
                          <div className="font-bold">{peso(o.total)}</div>
                          <div className="flex flex-col items-end gap-2">
                            {o.fulfillmentStatus !== "cancelled" && (
                              <Link to="/order/$id" params={{ id: o._id || o.id }}>
                                <button className="mt-4 text-xs underline text-muted-foreground">
                                  Track Order
                                </button>
                              </Link>
                            )}

                            {(o.fulfillmentStatus === "delivered" || o.fulfillmentStatus === "cancelled") && (
                              <button
                                onClick={() => {
                                  o.items?.forEach((item: any) => {
                                    add({
                                      productId: item.productId,
                                      variantId: item.variantId,
                                      name: item.name,
                                      brand: item.brand,
                                      image: item.image,
                                      quantity: item.quantity,
                                      priceAtAdd: (item.priceAtAdd ?? item.price) || 0,
                                      size: item.size,
                                      color: item.color,
                                    });
                                  });
                                  toast.success("Order items added to cart.");
                                }}
                                className="mt-4 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-gold-foreground transition hover:bg-gold/90"
                              >
                                Reorder
                              </button>
                            )}
                          </div>

                          {/* CANCEL BUTTON */}
                          {(o.fulfillmentStatus === "placed" || o.fulfillmentStatus === "processing") && (
                            <button
                              onClick={() => {
                                if (confirm("Cancel this order?")) {
                                  cancelMutation.mutate(o._id || o.id);
                                  // toast.success(`Order ${o._id || o.id} cancelled`);
                                }
                              }}
                              disabled={cancellingId === (o._id || o.id)}
                              className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {cancellingId === (o._id || o.id) ? "Cancelling..." : "Cancel Order"}
                            </button>
                          )}
                          {/* RETURN AND REVIEW BUTTON */}
                          {o.fulfillmentStatus === "delivered" && (
                            <>
                              <button
                                onClick={() => {
                                  // open return request modal/page
                                }}
                                className="w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                              >
                                Request Return
                              </button>
                              <button
                                onClick={() => {
                                  // open review modal/page
                                }}
                                className="w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                              >
                                Rate
                              </button>
                            </>
                          )}
                        </div>
                      </div>   
                    </div>        
                  );
                })}
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

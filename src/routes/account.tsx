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
import { fetchOrders, cancelOrder, requestReturn } from "@/lib/order-api";
import { fetchWishlist, createReview } from "@/lib/product-api";
import { StarInput } from "@/components/site/StarInput";
import { reorderItems } from "@/lib/reorder";

import { WishlistableCard } from "@/components/site/ProductCard";

import { USD } from "@/lib/format";
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
  const { user, logout, changePassword, accessToken } = useAuth();
  const { add } = useCart();
  const nav = Route.useNavigate();
  const search = Route.useSearch();
  const [tab, setTab] = useState<"profile" | "orders" | "wishlist" | "security">(
    search.tab ?? "profile"
  );
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnItems, setReturnItems] = useState<Record<string, boolean>>({});
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewValues, setReviewValues] = useState<Record<string, { rating: number; title: string; body: string }>>({});
  const [reviewImages, setReviewImages] = useState<Record<string, File[]>>({});

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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const qc = useQueryClient();

  const getProductId = (item: any) => String(
    item?.product?._id ?? item?.product?.id ?? item?.product ?? item?.productId ?? ""
  );

  const getItemKey = (item: any, fallback: string = "item") => {
    const productId = getProductId(item);
    const variantId = item?.variantId || item?.variant || productId || fallback;
    return `${productId || fallback}-${variantId}`;
  };

  const getReturnedItemKeys = (order: any) => {
    const returnedKeys = new Set((order?.returnedItems || []).map((item: any) => getItemKey(item)));
    const requestedKeys = new Set((order?.returnRequest?.returnItems || []).map((item: any) => getItemKey(item)));
    return new Set([...returnedKeys, ...requestedKeys]);
  };

  const getAvailableReturnItems = (order: any) => {
    const returnedKeys = getReturnedItemKeys(order);
    return (order?.items || []).filter((item: any) => !returnedKeys.has(getItemKey(item)));
  };

  const getReturnListItems = (order: any) => {
    const returnedKeys = getReturnedItemKeys(order);
    return (order?.items || []).map((item: any, index: number) => ({
      ...item,
      orderItemIndex: index,
      itemKey: `${order?._id || order?.id || 'order'}-${getItemKey(item, String(index))}`,
      wasReturned: returnedKeys.has(getItemKey(item)),
    }));
  };

  const hasReturnHistory = (order: any) => {
    const returnedCount = Array.isArray(order?.returnedItems) ? order.returnedItems.length : 0;
    const requestedCount = Array.isArray(order?.returnRequest?.returnItems) ? order.returnRequest.returnItems.length : 0;
    return returnedCount > 0 || requestedCount > 0;
  };

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match");
      }

      return changePassword(currentPassword, newPassword, confirmPassword);
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Unable to update password");
    },
  });

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

  const submitReturnMutation = useMutation({
    mutationFn: ({ orderId, reason, items }: { orderId: string; reason: string; items: any[] }) =>
      requestReturn(orderId, { reason, email: user?.email, items }, accessToken || ""),
    onSuccess: () => {
      setReturnOrderId(null);
      setReturnReason("");
      setReturnItems({});
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Return request submitted");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Unable to request return");
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async ({ order, item, key }: { order: any; item: any; key: string }) => {
      const payload = reviewValues[key] || { rating: 5, title: "", body: "" };
      const files = reviewImages[key] || [];
      const productId = getProductId(item);
      const title = (payload.title || `${item.name} review`).trim();
      const body = (payload.body || "I received this order and wanted to share my feedback.").trim();
      if (!productId) {
        throw new Error("This product could not be matched to a valid product ID.");
      }
      const formData = new FormData();
      formData.append("product", productId);
      formData.append("rating", String(payload.rating));
      formData.append("title", title || `${item.name} review`);
      formData.append("body", body || "I received this order and wanted to share my feedback.");
      formData.append("orderId", order._id || order.id || "");
      formData.append("guestEmail", user?.email || "");
      formData.append("guestName", user?.name || "Guest");
      files.forEach((file) => formData.append("images", file));
      return createReview(formData, accessToken || undefined);
    },
    onSuccess: () => {
      setReviewOrderId(null);
      setReviewValues({});
      setReviewImages({});
      toast.success("Rating submitted");
      qc.invalidateQueries({ queryKey: ["product-reviews"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Unable to submit rating");
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
                            {o.status}
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
                        <div className="flex min-w-35 flex-col items-end gap-2 text-right">
                          <div className="font-bold">{USD(o.total)}</div>
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
                                onClick={() => reorderItems(o, add)}
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
                          {(o.fulfillmentStatus === "delivered" || o.fulfillmentStatus === "return requested" || o.fulfillmentStatus === "return approved" || o.paymentStatus === "pending_refund") && (() => {
                            const deliveredAt = o.deliveredAt || o.updatedAt || o.createdAt;
                            const isWithinReturnWindow = !deliveredAt || (Date.now() - new Date(deliveredAt).getTime()) <= 14 * 24 * 60 * 60 * 1000;
                            const availableReturnItems = getAvailableReturnItems(o);
                            const previousReturnExists = hasReturnHistory(o);
                            const allItemsReturned = (o.items?.length || 0) > 0 && getReturnedItemKeys(o).size >= (o.items?.length || 0);
                            const canRequestReturn = isWithinReturnWindow && availableReturnItems.length > 0;
                            return (
                              <>
                                {isWithinReturnWindow ? (
                                  canRequestReturn ? (
                                    <button
                                      onClick={() => {
                                        setReturnOrderId(o._id || o.id);
                                        setReturnReason("");
                                        setReturnItems({});
                                      }}
                                      className="w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                                    >
                                      Request Return
                                    </button>
                                  ) : (
                                    <button
                                      disabled
                                      className="w-full rounded-md border border-muted-foreground/20 bg-muted px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground disabled:cursor-not-allowed"
                                    >
                                      {allItemsReturned ? "All items returned" : "Request Return"}
                                    </button>
                                  )
                                ) : (
                                  <button
                                    disabled
                                    className="w-full rounded-md border border-muted-foreground/20 bg-muted px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground disabled:cursor-not-allowed"
                                  >
                                    Return window closed
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setReviewOrderId(o._id || o.id);
                                    setReviewValues({});
                                  }}
                                  className="w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                                >
                                  Rate
                                </button>
                              </>
                            );
                          })()}
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
          <form className="grid max-w-md gap-4" onSubmit={(event) => {
            event.preventDefault();
            changePasswordMutation.mutate();
          }}>
            <label className="block">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current password</div>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">New password</div>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm new password</div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={changePasswordMutation.status === "pending"}
              className="w-fit rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {changePasswordMutation.status === "pending" ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>

      {returnOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setReturnOrderId(null)}>
          <div className="w-full max-w-lg rounded-xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Request a return</h3>
            <div className="mt-4 space-y-3">
              {getReturnListItems(orders.find((order: any) => (order._id || order.id) === returnOrderId)).map((item: any) => {
                const key = item.itemKey;
                const checked = !!returnItems[key];
                const wasReturned = item.wasReturned;
                if (wasReturned) {
                  return (
                    <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3 opacity-80">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-sm border border-muted-foreground/40 bg-muted" />
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.color} • Size {item.size}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Returned</span>
                        <div className="text-sm font-semibold text-muted-foreground">{USD(item.price || 0)}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setReturnItems((prev) => ({ ...prev, [key]: !prev[key] }))}
                        className="h-4 w-4"
                      />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.color} • Size {item.size}</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{USD(item.price || 0)}</div>
                  </label>
                );
              })}
            </div>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Tell us why you need to return this item"
              rows={4}
              className="mt-4 w-full rounded-md border border-input bg-background p-3 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setReturnOrderId(null); setReturnItems({}); }} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  if (!returnOrderId) return;
                  const order = orders.find((entry: any) => (entry._id || entry.id) === returnOrderId);
                  const selectedItems = getReturnListItems(order)
                    .filter((item: any) => !item.wasReturned && !!returnItems[item.itemKey])
                    .map((item: any) => ({
                      orderItemIndex: Number(item.orderItemIndex),
                      product: getProductId(item),
                      variantId: item.variantId || item.variant,
                      name: item.name,
                      quantity: item.quantity || 1,
                      price: Number(item.price || 0),
                    }));

                  if (!selectedItems.length) {
                    toast.error("Select at least one item to return.");
                    return;
                  }

                  try {
                    await submitReturnMutation.mutateAsync({ orderId: returnOrderId, reason: returnReason, items: selectedItems });
                  } catch (err: any) {
                    // mutateAsync throws, so show error and keep modal open for user correction
                    toast.error(err?.message || "Unable to submit return request");
                  }
                }}
                disabled={submitReturnMutation.status === "pending"}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {submitReturnMutation.status === "pending" ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setReviewOrderId(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Rate your order</h3>
            <div className="mt-4 space-y-5">
              {orders.find((order: any) => (order._id || order.id) === reviewOrderId)?.items?.map((item: any, index: number) => {
                const key = `${reviewOrderId}-${getItemKey(item, String(index))}`;
                const value = reviewValues[key] || { rating: 5, title: "", body: "" };
                return (
                  <div key={key} className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <img src={getImageSrc(item.image)} alt={item.name} className="h-12 w-12 rounded-md object-cover" />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.color} • Size {item.size}</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <StarInput value={value.rating} onChange={(rating) => setReviewValues((prev) => ({ ...prev, [key]: { ...value, rating } }))} />
                    </div>
                    <input
                      value={value.title}
                      onChange={(e) => setReviewValues((prev) => ({ ...prev, [key]: { ...value, title: e.target.value } }))}
                      placeholder="Review title"
                      className="mt-3 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                    <textarea
                      value={value.body}
                      onChange={(e) => setReviewValues((prev) => ({ ...prev, [key]: { ...value, body: e.target.value } }))}
                      rows={3}
                      placeholder="Share your experience"
                      className="mt-3 w-full rounded-md border border-input bg-background p-3 text-sm"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        setReviewImages((prev) => ({ ...prev, [key]: files.slice(0, 4) }));
                      }}
                      aria-label={`Upload image for ${item.name}`}
                      className="mt-3 text-xs"
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setReviewOrderId(null)} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  const order = orders.find((entry: any) => (entry._id || entry.id) === reviewOrderId);
                  if (!order) return;
                  order.items?.forEach((item: any, index: number) => {
                    const productId = getProductId(item);
                    if (!productId) return;
                    const key = `${reviewOrderId}-${getItemKey(item, String(index))}`;
                    submitReviewMutation.mutate({ order, item, key }, { onError: () => undefined });
                  });
                }}
                disabled={submitReviewMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {submitReviewMutation.isPending ? "Submitting..." : "Submit Ratings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

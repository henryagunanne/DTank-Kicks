import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Package, Truck, Home } from 'lucide-react'
import { trackOrder, cancelGuestOrder, requestReturn } from '@/lib/order-api'
import { createReview } from '@/lib/product-api'
import { useCart } from '@/lib/cart-context'
import { reorderItems } from '@/lib/reorder'
import { StarInput } from '@/components/site/StarInput'

export const Route = createFileRoute('/track/$token')({
  component: TrackOrderPage,
  head: ({ params }) => ({ meta: [{ title: `Track ${params.token} — DTank-Kicks` }] }),
})

function TrackOrderPage() {
  const { add } = useCart();
  const { token } = Route.useParams()
  const [order, setOrder] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [returning, setReturning] = useState(false)
  const [returnItems, setReturnItems] = useState<Record<string, boolean>>({})
  const [reviewing, setReviewing] = useState(false)
  const [reviewValues, setReviewValues] = useState<Record<string, { rating: number; title: string; body: string }>>({})
  const [reviewImages, setReviewImages] = useState<Record<string, File[]>>({})

  const getProductId = (item: any) => String(
    item?.product?._id ?? item?.product?.id ?? item?.product ?? item?.productId ?? ""
  )

  const getItemKey = (item: any, fallback = 'item') => {
    const productId = getProductId(item)
    const variantId = item?.variantId || item?.variant || productId || fallback
    return `${productId || fallback}-${variantId}`
  }

  // Fetch order details when the token changes
  useEffect(() => {
    if (!token) return

    setLoading(true)
    setError(null)

    trackOrder(token)
      .then((data) => {
        setOrder(data)
      })
      .catch((err) => {
        console.error(err)
        setError(err.message || "Unable to fetch order.")
        toast.error("Unable to fetch order. Please check your token and try again.")
      })
      .finally(() => setLoading(false))
  }, [token])

  const stagesMeta = [
    { label: 'Placed', value: 'placed', icon: Check },
    { label: 'Processing', value: 'processing', icon: Package },
    { label: 'Shipped', value: 'shipped', icon: Truck },
    { label: 'Delivered', value: 'delivered', icon: Home },
  ]

  // Handle order cancellation
  const handleCancel = async () : Promise<any> => {
    if (!confirm("Cancel this order?")) return;

    try {
      setCancelling(true);
      const updated = await cancelGuestOrder(token);

      setOrder(updated);
      toast.success("Order cancelled.");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const getReturnedItemKeys = (orderData: any) => {
    const returnedKeys = new Set((orderData?.returnedItems || []).map((item: any) => getItemKey(item)))
    const requestedKeys = new Set((orderData?.returnRequest?.returnItems || []).map((item: any) => getItemKey(item)))
    return new Set([...returnedKeys, ...requestedKeys])
  }

  const getReturnListItems = (orderData: any) => {
    const returnedKeys = getReturnedItemKeys(orderData)
    return (orderData?.items || []).map((item: any, index: number) => ({
      ...item,
      itemKey: `${orderData?._id || orderData?.id || 'order'}-${getItemKey(item, String(index))}`,
      wasReturned: returnedKeys.has(getItemKey(item)),
    }))
  }

  const hasReturnHistory = (orderData: any) => {
    return (Array.isArray(orderData?.returnedItems) && orderData.returnedItems.length > 0)
      || (Array.isArray(orderData?.returnRequest?.returnItems) && orderData.returnRequest.returnItems.length > 0)
  }

  const handleReturnRequest = async () => {
    if (!order) return;
    const selectedItems = getReturnListItems(order)
      .filter((item: any) => !item.wasReturned)
      .filter((item: any) => !!returnItems[item.itemKey])
      .map((item: any) => ({
        product: getProductId(item),
        variantId: item.variantId,
        name: item.name,
        quantity: item.quantity || 1,
        price: Number(item.price || 0),
      }));

    if (!selectedItems.length) {
      toast.error('Select at least one item to return.');
      return;
    }

    try {
      setReturning(true);
      await requestReturn(order._id, {
        reason: returnReason,
        email: order.shippingAddress?.email || order.guestEmail,
        items: selectedItems,
      }, undefined);
      setOrder({ ...order, status: 'return requested', fulfillmentStatus: 'return requested', returnRequest: { status: 'requested', reason: returnReason, returnItems: selectedItems } });
      setReturnReason('');
      setReturnItems({});
      toast.success('Return request submitted.');
    } catch (err: any) {
      toast.error(err.message || 'Unable to request return');
    } finally {
      setReturning(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!order) return;
    const items = order.items || [];
    for (const item of items) {
      const productId = getProductId(item);
      if (!productId) continue;
      const key = `${order._id}-${getItemKey(item, item.name || 'item')}`;
      const review = reviewValues[key] || { rating: 5, title: `${item.name} review`, body: 'Great experience.' };
      const title = (review.title || `${item.name} review`).trim();
      const body = (review.body || 'Great experience.').trim();
      const files = reviewImages[key] || [];
      const formData = new FormData();
      formData.append('product', productId);
      formData.append('rating', String(review.rating));
      formData.append('title', title || `${item.name} review`);
      formData.append('body', body || 'Great experience.');
      formData.append('guestEmail', order.shippingAddress?.email || order.guestEmail || '');
      formData.append('guestName', order.shippingAddress?.name || 'Guest');
      formData.append('orderId', order._id);
      files.forEach((file) => formData.append('images', file));
      await createReview(formData, undefined);
    }
    toast.success('Thank you for your review.');
    setReviewing(false);
    setReviewValues({});
    setReviewImages({});
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight">Order tracking</h1>
      <p className="mt-3 text-sm text-muted-foreground">Tracking token: <span className="font-mono font-semibold">{token}</span></p>

      {loading ? (
        <div className="mt-10 rounded-2xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">Loading order details...</div>
      ) : error ? (
        <div className="mt-10 rounded-2xl border border-destructive bg-destructive/10 p-8 text-sm text-destructive">
          {error}
        </div>
      ) : order ? (
        <>
          <div className="mt-10 rounded-xl border border-border p-6">
            <div className="mb-2 text-xs uppercase text-muted-foreground">Carrier</div>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{order.carrier || 'LBC Express'}</div>
              <div className="font-mono text-sm">{order.trackingNumber ? `TRK-${order.trackingNumber}` : `ORD-${order._id}`}</div>
            </div>
          </div>

          <div className="mt-10">
            <div className="relative flex justify-between">
              <div className="absolute left-6 right-6 top-6 h-1 rounded bg-border" />
              {(() => {
                const statusOrder = ["placed", "processing", "shipped", "delivered"]
                const currentIndex = Math.max(0, statusOrder.indexOf(order.fulfillmentStatus))
                const progressWidth = currentIndex > 0 ? `${(currentIndex / (statusOrder.length - 1)) * 100}%` : "0%"
                return <div className="absolute left-6 top-6 h-1 rounded bg-gold" style={{ width: progressWidth }} />
              })()}
              {stagesMeta.map((s) => {
                const Icon = s.icon
                const statusOrder = ["placed", "processing", "shipped", "delivered"]
                const done = statusOrder.indexOf(order.fulfillmentStatus) >= statusOrder.indexOf(s.value)
                const ts = s.value === 'placed' ? order.createdAt : order.updatedAt

                return (
                  <div key={s.label} className="relative z-10 flex w-1/4 flex-col items-center text-center">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-background ${done ? "bg-gold text-gold-foreground" : "bg-secondary text-muted-foreground"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-xs font-bold">{s.label}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{ts ? new Date(ts).toLocaleDateString() : "—"}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-10 space-y-8">
            <div className="rounded-2xl border border-border bg-background p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Order ID</div>
                  <div className="font-semibold">{order._id}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Status</div>
                  <div className="font-semibold capitalize">{order.fulfillmentStatus}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-6">
              <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Shipping</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Name</div>
                  <div>{order.shippingAddress?.name || "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Email</div>
                  <div>{order.shippingAddress?.email || order.guestEmail || "—"}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Address</div>
                  <div>{order.shippingAddress?.line1}, {order.shippingAddress?.city}, {order.shippingAddress?.province}, {order.shippingAddress?.country}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-6">
              <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Items</div>
              <div className="space-y-4">
                {order.items?.map((item: any) => (
                  <div key={`${item.product}-${item.variantId}`} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img
                            src={item.image.startsWith('http') ? item.image : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${item.image.startsWith('/') ? '' : '/'}${item.image}`}
                            alt={item.name}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-secondary text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                        <div>
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.brand} • {item.color} • {item.size}</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold">Qty {item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-background p-6">
                <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Actions</div>
                <div className="flex flex-wrap gap-3">
                    {["placed", "processing"].includes(order.fulfillmentStatus) && (
                        <button
                            onClick={handleCancel}
                            disabled={cancelling}
                            className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                            {cancelling
                                ? "Cancelling..."
                                : "Cancel Order"}
                        </button>
                    )}

                    {["delivered", "cancelled"].includes(order.fulfillmentStatus) && (
                        <button
                            onClick={() => reorderItems(order, add)}
                            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground hover:bg-gold/90"
                        >
                            Reorder
                        </button>
                    )}

                    {(order.fulfillmentStatus === "delivered" || order.fulfillmentStatus === "return requested" || order.fulfillmentStatus === "return approved" || order.paymentStatus === "pending_refund") && (() => {
                      const deliveredAt = order.deliveredAt || order.updatedAt || order.createdAt;
                      const isWithinReturnWindow = !deliveredAt || (Date.now() - new Date(deliveredAt).getTime()) <= 14 * 24 * 60 * 60 * 1000;
                      const hasRemainingItems = getReturnListItems(order).some((item: any) => !item.wasReturned);
                      const canRequestReturn = isWithinReturnWindow && (hasRemainingItems || hasReturnHistory(order));

                      return (
                        <>
                          {canRequestReturn ? (
                            <button
                              onClick={() => {
                                setReturnItems({});
                                setReviewing(false);
                                setReturning(true);
                              }}
                              className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                            >
                              Request Return
                            </button>
                          ) : (
                            <div className="rounded-md border border-muted-foreground/20 bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Return window closed
                            </div>
                          )}

                          <button
                            onClick={() => setReviewing(true)}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                          >
                            Rate Products
                          </button>
                        </>
                      );
                    })()}
                </div>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-10 rounded-2xl border border-border bg-background p-8 text-sm text-muted-foreground">No order details found.</div>
      )}

      {(returning || reviewing) && order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { setReturning(false); setReviewing(false); }}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            {returning ? (
              <>
                <h3 className="text-lg font-bold">Request return</h3>
                <div className="mt-4 space-y-3">
                  {getReturnListItems(order).map((item: any) => {
                    const key = item.itemKey;
                    const checked = !!returnItems[key];
                    if (item.wasReturned) {
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
                            <div className="text-sm font-semibold text-muted-foreground">{item.price ? `$${item.price}` : '—'}</div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={checked} onChange={() => setReturnItems((prev) => ({ ...prev, [key]: !prev[key] }))} className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.color} • Size {item.size}</div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{item.price ? `$${item.price}` : '—'}</div>
                      </label>
                    );
                  })}
                </div>
                <textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} rows={5} className="mt-4 w-full rounded-md border border-input bg-background p-3 text-sm" placeholder="Describe the issue" />
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => { setReturning(false); setReturnItems({}); }} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
                  <button onClick={handleReturnRequest} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Submit</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold">Rate this order</h3>
                <div className="mt-4 space-y-4">
                  {(order.items || []).map((item: any, index: number) => {
                    const key = `${order._id || 'order'}-${getItemKey(item, String(index))}`;
                    const value = reviewValues[key] || { rating: 5, title: `${item.name} review`, body: '' };
                    return (
                      <div key={key} className="rounded-lg border border-border p-4">
                        <div className="font-medium">{item.name}</div>
                        <div className="mt-2"><StarInput value={value.rating} onChange={(rating) => setReviewValues((prev) => ({ ...prev, [key]: { ...value, rating } }))} /></div>
                        <input value={value.title} onChange={(e) => setReviewValues((prev) => ({ ...prev, [key]: { ...value, title: e.target.value } }))} placeholder="Review title" className="mt-3 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
                        <textarea value={value.body} onChange={(e) => setReviewValues((prev) => ({ ...prev, [key]: { ...value, body: e.target.value } }))} rows={3} placeholder="Tell us about your experience" className="mt-3 w-full rounded-md border border-input bg-background p-3 text-sm" />
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
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setReviewing(false)} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
                  <button onClick={handleReviewSubmit} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Submit Reviews</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

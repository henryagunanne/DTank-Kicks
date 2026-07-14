import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Package, Truck, Home } from 'lucide-react'
import { trackOrder, cancelGuestOrder } from '@/lib/order-api'
import { useCart } from '@/lib/cart-context'
import { reorderItems } from '@/lib/reorder'

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
      // reload the page
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
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

                    {order.fulfillmentStatus === "delivered" && (
                      <>
                        <button
                          onClick={() => {
                            // TODO: Open return request modal/page
                          }}
                          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                        >
                          Request Return
                        </button>

                        <button
                            onClick={() => {
                                // TODO
                            }}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                        >
                            Rate Products
                        </button>
                        </>
                      )}
                </div>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-10 rounded-2xl border border-border bg-background p-8 text-sm text-muted-foreground">No order details found.</div>
      )}
    </div>
  )
}

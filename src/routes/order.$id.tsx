import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Package, Truck, Home } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { trackOrderByID } from "@/lib/order-api";

export const Route = createFileRoute("/order/$id")({
  component: TrackingPage,
  head: ({ params }) => ({ meta: [{ title: `Track ${params.id} — DTank-Kicks` }] }),
});

function TrackingPage() {
  const { id } = Route.useParams();
  const { user, accessToken } = useAuth();

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // Require login to fetch by ID
    if (!user) {
      setLoading(false);
      setError("You must be signed in to view orders by ID. Use the Track tab to track your order");
      return;
    }

    setLoading(true);
    setError(null);

    trackOrderByID(id, accessToken? accessToken : "")
      .then((data) => setOrder(data))
      .catch((err) => {
        console.error(err);
        setError(err.message || "Unable to fetch order.");
        toast.error("Unable to fetch order. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  const stagesMeta = [
    { label: "Placed", value: "placed", icon: Check },
    { label: "Processing", value: "processing", icon: Package },
    { label: "Shipped", value: "shipped", icon: Truck },
    { label: "Delivered", value: "delivered", icon: Home },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight">Track your order</h1>
      <div className="mt-2 text-sm text-muted-foreground">Order <span className="font-mono font-semibold">{id}</span></div>

      {loading ? (
        <div className="mt-10 rounded-2xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">Loading order details...</div>
      ) : error ? (
        <div className="mt-10 rounded-2xl border border-destructive bg-destructive/10 p-8 text-sm text-destructive">{error}</div>
      ) : order ? (
        <>
          <div className="mt-10 rounded-xl border border-border p-6">
            <div className="mb-2 text-xs uppercase text-muted-foreground">Carrier</div>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{order.carrier || "LBC Express"}</div>
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
                const Icon = s.icon;
                const statusOrder = ["placed", "processing", "shipped", "delivered"];
                const done = statusOrder.indexOf(order.fulfillmentStatus) >= statusOrder.indexOf(s.value);
                const ts = s.value === "placed" ? order.createdAt : order.updatedAt;

                return (
                  <div key={s.label} className="relative z-10 flex w-1/4 flex-col items-center text-center">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-background ${done ? "bg-gold text-gold-foreground" : "bg-secondary text-muted-foreground"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-xs font-bold">{s.label}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{ts ? new Date(ts).toLocaleDateString() : "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-10 rounded-2xl border border-border bg-background p-8 text-sm text-muted-foreground">No order details found.</div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { trackOrderByID } from "@/lib/order-api";

export const Route = createFileRoute("/order/success")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : "SS-DEMO" }),
  component: SuccessPage,
  head: () => ({ meta: [{ title: "Order Confirmed — DTank-Kicks" }] }),
});

function SuccessPage() {
  const { id } = Route.useSearch();
  const { accessToken } = useAuth();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const est = new Date(Date.now() + 5 * 86400000).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const data = await trackOrderByID(id, accessToken || undefined);
        setOrder(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (id) loadOrder();
  }, [id, accessToken]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gold/15">
        <div className="flex h-16 w-16 animate-bounce items-center justify-center rounded-full bg-gold text-gold-foreground">
          <Check className="h-8 w-8" strokeWidth={3} />
        </div>
      </div>
      <h1 className="mt-8 text-4xl font-black tracking-tight">Thank you for your order!</h1>
      <p className="mt-3 text-muted-foreground">{loading ? "Loading your order details…" : "A confirmation email is on its way."}</p>
      <div className="mt-8 rounded-xl border border-border p-6 text-left">
        <div className="flex justify-between text-sm">
          <div><div className="text-xs uppercase text-muted-foreground">Order number</div><div className="font-bold">{id}</div></div>
          <div className="text-right"><div className="text-xs uppercase text-muted-foreground">Estimated delivery</div><div className="font-bold">{est}</div></div>
        </div>
        {order && (
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <div><span className="font-semibold text-foreground">Payment status:</span> {order.paymentStatus || "pending"}</div>
            {order.receiptUrl && <div><span className="font-semibold text-foreground">Receipt:</span> <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="text-gold">View receipt</a></div>}
            {order.shippingAddress && <div><span className="font-semibold text-foreground">Shipping:</span> {order.shippingAddress.line1}, {order.shippingAddress.city}</div>}
          </div>
        )}
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/order/$id" params={{ id }} className="rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase text-primary-foreground">Track your order</Link>
        <Link to="/shop" search={{}} className="rounded-full border border-border px-6 py-3 text-sm font-bold uppercase">Continue shopping</Link>
      </div>
    </div>
  );
}

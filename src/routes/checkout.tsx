import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, ShieldCheck, Truck, RotateCcw, Lock } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-context";
import { peso } from "@/lib/format";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Checkout — SoleStore" }] }),
});

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const nav = useNavigate();
  const [delivery, setDelivery] = useState<"std" | "exp">("std");
  const [payment, setPayment] = useState<"card" | "paypal">("card");
  const [submitting, setSubmitting] = useState(false);

  const shipFee = delivery === "exp" ? 350 : subtotal >= 2000 ? 0 : 150;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + shipFee + tax;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link to="/shop" search={{}} className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Shop now</Link>
      </div>
    );
  }

  const placeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      const id = "SS-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      try { localStorage.setItem(`order_${id}`, JSON.stringify({ id, items, total, delivery, createdAt: Date.now() })); } catch {}
      clear();
      toast.success("Order placed!");
      nav({ to: "/order/success", search: { id } });
    }, 900);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Checkout</h1>
      <form onSubmit={placeOrder} className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          {/* Contact & Shipping */}
          <section className="rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold">1. Contact & Shipping</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full name" required />
              <Input label="Email" type="email" required />
              <Input label="Phone" type="tel" required />
              <Input label="Country" defaultValue="Philippines" required />
              <div className="sm:col-span-2"><Input label="Address" required /></div>
              <Input label="City" required />
              <Input label="Province" required />
              <Input label="Postal code" required />
            </div>
          </section>

          {/* Delivery */}
          <section className="rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold">2. Delivery Method</h2>
            <div className="mt-5 space-y-3">
              <DeliveryOpt name="std" selected={delivery === "std"} onClick={() => setDelivery("std")} title="Standard" sub="3–5 days" price={subtotal >= 2000 ? "FREE" : peso(150)} />
              <DeliveryOpt name="exp" selected={delivery === "exp"} onClick={() => setDelivery("exp")} title="Express" sub="1–2 days" price={peso(350)} />
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold">3. Payment</h2>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setPayment("card")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 ${payment === "card" ? "border-gold bg-gold/10" : "border-border"}`}>
                <CreditCard className="h-5 w-5" /> Card
              </button>
              <button type="button" onClick={() => setPayment("paypal")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 font-bold text-blue-600 ${payment === "paypal" ? "border-gold bg-gold/10" : "border-border"}`}>
                PayPal
              </button>
            </div>
            {payment === "card" && (
              <div className="mt-5 grid gap-4">
                <Input label="Card number" placeholder="4242 4242 4242 4242" required />
                <div className="grid grid-cols-3 gap-4">
                  <Input label="Exp." placeholder="MM/YY" required />
                  <Input label="CVC" placeholder="123" required />
                  <Input label="ZIP" required />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Stripe-secured payment</div>
              </div>
            )}
          </section>

          <div className="flex gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-gold" /> SSL secure</span>
            <span className="flex items-center gap-1"><Truck className="h-4 w-4 text-gold" /> Free shipping over ₱2,000</span>
            <span className="flex items-center gap-1"><RotateCcw className="h-4 w-4 text-gold" /> Money-back guarantee</span>
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-border p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Order Summary</h2>
          <div className="mt-5 space-y-3 max-h-60 overflow-y-auto pr-2">
            {items.map((it) => (
              <div key={it.id} className="flex gap-3">
                <img src={it.image} alt={it.name} loading="lazy" className="h-14 w-14 rounded-md object-cover" />
                <div className="flex-1 text-xs">
                  <div className="font-semibold">{it.name}</div>
                  <div className="text-muted-foreground">UK {it.size} • {it.color} • Qty {it.quantity}</div>
                </div>
                <div className="text-sm font-semibold">{peso(it.price * it.quantity)}</div>
              </div>
            ))}
          </div>
          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{peso(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{shipFee === 0 ? "FREE" : peso(shipFee)}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>Tax</dt><dd>{peso(tax)}</dd></div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold"><dt>Total</dt><dd>{peso(total)}</dd></div>
          </dl>
          <button disabled={submitting} className="mt-6 w-full rounded-full bg-gold py-3.5 text-sm font-bold uppercase tracking-wider text-gold-foreground disabled:opacity-60">
            {submitting ? "Processing..." : `Place Order • ${peso(total)}`}
          </button>
        </aside>
      </form>
    </div>
  );
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <input {...props} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-gold" />
    </label>
  );
}
function DeliveryOpt({ name, selected, onClick, title, sub, price }: { name: string; selected: boolean; onClick: () => void; title: string; sub: string; price: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center justify-between rounded-lg border-2 p-4 text-left ${selected ? "border-gold bg-gold/10" : "border-border"}`} data-name={name}>
      <div>
        <div className="font-bold">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <div className="font-bold">{price}</div>
    </button>
  );
}

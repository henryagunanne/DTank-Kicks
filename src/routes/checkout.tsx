import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, ShieldCheck, Truck, RotateCcw, Lock } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-context";
import { USD } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { PaymentForm } from "@/components/checkout/PaymentForm";

const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000"; // Fallback API base URL for client-side rendering  

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Checkout — DTank-Kicks" }] }),
});

function CheckoutPage() {
  const { user, accessToken } = useAuth();
  const { selectedCartItems, discount, removeSelectedItems, setSelectedItems } = useCart();
  const nav = useNavigate();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const primaryAddress = user?.addresses?.[0];

  const [name, setName] = useState(primaryAddress?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(primaryAddress?.phone || "");

  const [address, setAddress] = useState(primaryAddress?.line1 || "");
  const [city, setCity] = useState(primaryAddress?.city || "");
  const [province, setProvince] = useState(primaryAddress?.province || "");
  const [postalCode, setPostalCode] = useState(primaryAddress?.postalCode || "");
  const [country, setCountry] = useState(primaryAddress?.country || "Philippines");

  // const discount = useCart().discount; // Get the discount from the cart context
  const [delivery, setDelivery] = useState<"std" | "exp">("std");
  const [payment, setPayment] = useState<"card" | "paypal">("card");
  const [submitting, setSubmitting] = useState(false);

  const subtotal = selectedCartItems.reduce(
    (sum, item) =>
      sum + item.priceAtAdd * item.quantity,
    0
  );

  const shipFee = delivery === "exp" ? 350 : subtotal >= 2000 ? 0 : 150;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + shipFee + tax;

  if (selectedCartItems.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link to="/shop" search={{}} className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Shop now</Link>
      </div>
    );
  }

  // Prepare the payment by sending the shipping address, delivery method, discount, and selected item IDs to the server to create a payment intent and order
  const preparePayment = async () => {
    if (!selectedCartItems.length) return;

    try {
      setSubmitting(true);
      setPaymentError(null);
      setPaymentReady(false);

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`${API_BASE}/api/payments/create-payment-intent`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          shippingAddress: {
            name,
            email,
            phone,
            line1: address,
            city,
            province,
            postalCode,
            country,
          },
          deliveryMethod: delivery === "exp" ? "express" : "standard",
          discount,
          selectedItemIds: selectedCartItems.map((item) => item.id),
          selectedItems: selectedCartItems.map((item) => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            name: item.name,
            brand: item.brand,
            image: item.image,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            priceAtAdd: item.priceAtAdd,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          toast.warning("Your session has expired. You can still continue as a guest.");
        }
        throw new Error(data.error || "Unable to prepare payment");
      }

      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
      setPaymentReady(true);
      toast.success("Secure checkout is ready.");
    } catch (error) {
      console.error(error);
      setPaymentError(error instanceof Error ? error.message : "Unable to prepare payment");
      toast.error(error instanceof Error ? error.message : "Unable to prepare payment");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle the form submission for placing the order and initiating the payment process
  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (payment === "paypal") {
      toast.error("PayPal is not enabled for this checkout flow yet.");
      return;
    }

    if (!paymentReady || !clientSecret || !orderId) {
      await preparePayment();
      return;
    }

    toast.success("Complete the secure card payment below.");
  };

  // Handle successful payment by removing purchased items from the cart and navigating to the order success page
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      const idsToRemove = selectedCartItems.map((item) => item.id);
      if (idsToRemove.length > 0) {
        removeSelectedItems(idsToRemove);
        setSelectedItems([]);
      }
      nav({ to: "/order/success", search: { id: orderId || paymentIntentId } });
    } catch (error) {
      console.error(error);
      toast.error("Payment completed but the success page could not be opened.");
    }
  };

  // Helper function to determine the correct image source URL, handling both absolute URLs and relative paths from the server
  const getImageSrc = (img: string) => {
    if (img.startsWith("http")) {
      return img;
    } else if (img.startsWith("/uploads")) {
      return `${API_BASE}${img}`;
    } else {
      return img;
    }
  };


  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Checkout</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          {/* Contact & Shipping - if the user is logged in automatically fills in the fields with their information */}
          <section className="rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold">1. Contact & Shipping</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} required />
              <div className="sm:col-span-2"><Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} required /></div>
              <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} required />
              <Input label="Province" value={province} onChange={(e) => setProvince(e.target.value)} required />
              <Input label="Postal code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
            </div>
          </section>

          {/* Delivery */}
          <section className="rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold">2. Delivery Method</h2>
            <div className="mt-5 space-y-3">
              <DeliveryOpt name="std" selected={delivery === "std"} onClick={() => setDelivery("std")} title="Standard" sub="3–5 days" price={subtotal >= 2000 ? "FREE" : USD(150)} />
              <DeliveryOpt name="exp" selected={delivery === "exp"} onClick={() => setDelivery("exp")} title="Express" sub="1–2 days" price={USD(350)} />
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
              <div className="mt-5 space-y-4">
                {submitting && !clientSecret && <div className="text-sm text-muted-foreground">Preparing your secure checkout…</div>}
                {paymentError && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{paymentError}</div>}
                {clientSecret && (
                  <PaymentForm
                    clientSecret={clientSecret}
                    onSuccess={handlePaymentSuccess}
                    onError={(message) => setPaymentError(message)}
                  />
                )}
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
            {selectedCartItems.map((it) => (
              <div key={it.id} className="flex gap-3">
                <img src={getImageSrc(it.image)} alt={it.name} loading="lazy" className="h-14 w-14 rounded-md object-cover" />
                <div className="flex-1 text-xs">
                  <div className="font-semibold">{it.name}</div>
                  <div className="text-muted-foreground">US {it.size} • {it.color} • Qty {it.quantity}</div>
                </div>
                <div className="text-sm font-semibold">{USD(it.priceAtAdd * it.quantity)}</div>
              </div>
            ))}
          </div>
          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{USD(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{shipFee === 0 ? "FREE" : USD(shipFee)}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>Tax</dt><dd>{USD(tax)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-gold"><dt>Discount</dt><dd>-{USD(discount)}</dd></div>}
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold"><dt>Total</dt><dd>{USD(total)}</dd></div>
          </dl>
          <button type="button" onClick={() => placeOrder({ preventDefault: () => {} } as React.FormEvent)} disabled={submitting} className="mt-6 w-full rounded-full bg-gold py-3.5 text-sm font-bold uppercase tracking-wider text-gold-foreground disabled:opacity-60">
            {submitting ? "Preparing payment..." : `Pay • ${USD(total)}`}
          </button>
        </aside>
      </div>
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

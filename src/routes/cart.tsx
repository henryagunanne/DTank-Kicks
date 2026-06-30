/*
  This is the cart page where users can review their selected items, adjust quantities, 
  apply coupons, and proceed to checkout. It uses the cart context to manage state and 
  perform actions like updating quantities and removing items. The order summary calculates 
  totals, discounts, shipping, and tax based on the cart contents.
*/

import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-context";
import { fetchProductById } from "@/lib/product-api";
import { peso } from "@/lib/format";

const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000"; // Fallback API base URL for client-side rendering

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Your Cart — DTank-Kicks" }] }),
});

function CartPage() {
  const { items, updateQty, remove, selectedItems, setSelectedItems, discount, setDiscount } = useCart();
  const [coupon, setCoupon] = useState("");
  const [variantStockMap, setVariantStockMap] = useState<Record<string, number>>({});

  // The selectedItems state is an array of item IDs that the user has selected for checkout.
  // Each cart item has a checkbox that allows the user to select or deselect it. 
  // The order summary and checkout process will only consider the selected items when calculating totals and proceeding to checkout.
  const selectedCartItems = items.filter((item) =>
    selectedItems.includes(item.id)
  );

  
  useEffect(() => {
    let active = true;

    const groupedByProduct = items.reduce((acc, item) => {
      if (!acc[item.productId]) acc[item.productId] = new Set<string>();
      acc[item.productId].add(item.variantId);
      return acc;
    }, {} as Record<string, Set<string>>);

    Promise.all(
      Object.entries(groupedByProduct).map(async ([productId, variantIds]) => {
        try {
          const product = await fetchProductById(productId);
          return Array.from(variantIds).reduce<Record<string, number>>((acc, variantId) => {
            const variant = product.variants.find((v) => v.id === variantId);
            if (variant) acc[variantId] = variant.stock;
            return acc;
          }, {});
        } catch {
          return {};
        }
      })
    ).then((results) => {
      if (!active) return;
      setVariantStockMap(Object.assign({}, ...results));
    });

    return () => {
      active = false;
    };
  }, [items]);

  // Shipping is free for orders over 2000, otherwise it's 150. Tax is 12% of the subtotal after discount. 
  // Total is subtotal minus discount plus shipping and tax, but never less than 0.
  const selectedSubtotal = selectedCartItems.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
  const shipping = selectedSubtotal === 0 ? 0 : selectedSubtotal >= 2000 ? 0 : 150;
  const tax = Math.round((selectedSubtotal - discount) * 0.12);
  const total = Math.max(0, selectedSubtotal - discount + shipping + tax);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <ShoppingBag className="mx-auto h-20 w-20 text-muted-foreground/40" />
        <h1 className="mt-6 text-3xl font-black">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Looks like you haven't added anything yet.</p>
        <Link to="/shop" search={{}} className="mt-8 inline-block rounded-full bg-primary px-7 py-3 text-sm font-bold uppercase text-primary-foreground">Start shopping</Link>
      </div>
    );
  }

  // The applyCoupon function checks if the entered coupon code is "SOLE10". 
  // If it is, it applies a 10% discount to the subtotal and shows a success toast. If the code is invalid, it resets the discount to 0 and shows an error toast.
  // In a real application, you would likely want to validate the coupon code with the server to prevent abuse and ensure it applies to the correct items.
  const applyCoupon = () => {
    if (coupon.toUpperCase() === "SOLE10") { setDiscount(Math.round(selectedSubtotal * 0.1)); toast.success("10% discount applied"); }
    else { setDiscount(0); toast.error("Invalid coupon"); }
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
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Your Cart</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="flex gap-4 rounded-xl border border-border p-4">
               <input aria-label="Select item" type="checkbox" className="mt-2 h-4 w-4"
                checked={selectedItems.includes(it.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedItems((prev) => [...prev, it.id]);
                  } else {
                    setSelectedItems((prev) =>
                      prev.filter((id) => id !== it.id)
                    );
                  }
                }}
              />
              <Link to="/shop/$id" params={{ id: it.productId }} className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-secondary">
                <img src={getImageSrc(it.image)} alt={it.name} loading="lazy" className="h-full w-full object-cover" />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">{it.brand}</div>
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-xs text-muted-foreground">UK {it.size} • {it.color}</div>
                  </div>
                  <button onClick={() => remove(it.id)} aria-label="Remove"><X className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-border">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => updateQty(it.id, Math.max(1, it.quantity - 1))}
                      className="p-2"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{it.quantity}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => {
                        const maxStock = variantStockMap[it.variantId] ?? Infinity;
                        if (it.quantity < maxStock) {
                          updateQty(it.id, it.quantity + 1);
                        } else {
                          toast.error(`Only ${maxStock} item${maxStock === 1 ? "" : "s"} left in stock for this variant.`);
                        }
                      }}
                      className="p-2"
                      disabled={it.quantity >= (variantStockMap[it.variantId] ?? Infinity)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="font-bold">{peso(it.priceAtAdd * it.quantity)}</div>
                </div>
                {variantStockMap[it.variantId] !== undefined && it.quantity > variantStockMap[it.variantId] ? (
                  <p className="mt-2 text-xs text-red-500">Quantity exceeds available stock of {variantStockMap[it.variantId]}.</p>
                ) : null}
              </div>
            </div>
          ))}
          <Link to="/shop" search={{}} className="inline-block text-sm underline text-muted-foreground">← Continue shopping</Link>
        </div>

        <aside className="h-fit rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold">Order Summary</h2>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{peso(selectedSubtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-gold"><dt>Discount</dt><dd>-{peso(discount)}</dd></div>}
            <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? "FREE" : peso(shipping)}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>Estimated tax</dt><dd>{peso(tax)}</dd></div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold"><dt>Total</dt><dd>{peso(total)}</dd></div>
          </dl>
          <div className="mt-5 flex gap-2">
            <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
            <button onClick={applyCoupon} className="rounded-md border border-border px-3 text-sm font-semibold">Apply</button>
          </div>
          {selectedItems.length === 0 ? (
            <button
              disabled
              className="mt-6 block w-full rounded-full bg-primary/50 py-3.5 text-center text-sm font-bold uppercase tracking-wider text-primary-foreground"
            >
              Select Items First
            </button>
          ) : (
            <Link to="/checkout" className="mt-6 block w-full rounded-full bg-primary py-3.5 text-center text-sm font-bold uppercase tracking-wider text-primary-foreground">
              Proceed to Checkout
            </Link>
          )}
          <p className="mt-3 text-center text-[11px] text-muted-foreground">Try coupon code <span className="font-mono font-semibold">SOLE10</span></p>
        </aside>
      </div>
    </div>
  );
}

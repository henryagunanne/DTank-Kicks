import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CartItem } from "./types";

interface CartCtx {
  items: CartItem[];
  add: (item: Omit<CartItem, "id">) => void;
  remove: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "solestore_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const add: CartCtx["add"] = (item) => {
    setItems((prev) => {
      const match = prev.find(
        (p) => p.productId === item.productId && p.size === item.size && p.color === item.color,
      );
      if (match) {
        return prev.map((p) => (p.id === match.id ? { ...p, quantity: p.quantity + item.quantity } : p));
      }
      return [...prev, { ...item, id: crypto.randomUUID() }];
    });
  };
  const remove = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const updateQty = (id: string, qty: number) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, qty) } : i)));
  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return <Ctx.Provider value={{ items, add, remove, updateQty, clear, count, subtotal }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}

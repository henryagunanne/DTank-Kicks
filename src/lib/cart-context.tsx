import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CartItem } from "./types";
import { useAuth } from "./auth-context";
import { addOrUpdateItem, fetchCart, mergeCart, removeItem,  type ServerCart} from "./cart-api";

interface CartCtx {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "id">) => void;
  remove: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  isLoading: boolean;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "solestore_cart_v1";
const CART_QK = ["cart"] as const;

function readLocal(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: CartItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}

function clearLocal() {
  try { localStorage.removeItem(KEY); } catch {}
}

function lineMatches(a: Pick<CartItem, "productId" | "size" | "color">, b: Pick<CartItem, "productId" | "size" | "color">) {
  return a.productId === b.productId && a.size === b.size && a.color === b.color;
}

function totals(items: CartItem[]): ServerCart {
  return {
    items,
    totalItems: items.reduce((s, i) => s + i.quantity, 0),
    totalPrice: items.reduce((s, i) => s + i.price * i.quantity, 0),
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();
  const isAuthed = !!user;
  const mergedRef = useRef(false);

  // Source of truth = react-query cache. For guests we seed from localStorage and never call the network.
  const query = useQuery<ServerCart>({
    queryKey: CART_QK,
    queryFn: async () => {
      if (isAuthed) return await fetchCart(accessToken);
      return totals(readLocal());
    },
    staleTime: isAuthed ? 30_000 : Infinity,
    refetchOnWindowFocus: isAuthed,
  });

  const cart = query.data ?? { items: [], totalItems: 0, totalPrice: 0 };

  // Merge guest -> server cart once after login
  useEffect(() => {
    if (!isAuthed) { mergedRef.current = false; return; }
    if (mergedRef.current) return;
    mergedRef.current = true;
    const guest = readLocal();
    (async () => {
      try {
        const merged = guest.length > 0 ? await mergeCart(guest, accessToken) : await fetchCart(accessToken);
        qc.setQueryData(CART_QK, merged);
        clearLocal();
      } catch (e) {
        // network failure: keep localStorage intact, fall back to guest data
        console.error("Cart merge failed", e);
        mergedRef.current = false;
      }
    })();
  }, [isAuthed, qc]);

  // Persist to localStorage for guests whenever cache changes
  useEffect(() => {
    if (!isAuthed) writeLocal(cart.items);
  }, [cart.items, isAuthed]);

  const setLocalCart = useCallback((updater: (items: CartItem[]) => CartItem[]) => {
    qc.setQueryData<ServerCart>(CART_QK, (prev) => {
      const next = updater(prev?.items ?? []);
      return totals(next);
    });
  }, [qc]);

  const addMutation = useMutation({
    mutationFn: (item: CartItem) => addOrUpdateItem(item, accessToken),
    onSuccess: (data) => qc.setQueryData(CART_QK, data),
    onError: () => qc.invalidateQueries({ queryKey: CART_QK }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeItem(id, accessToken),
    onSuccess: (data) => qc.setQueryData(CART_QK, data),
    onError: () => qc.invalidateQueries({ queryKey: CART_QK }),
  });

  const add: CartCtx["add"] = (item) => {
    let newLine: CartItem | null = null;
    setLocalCart((items) => {
      const match = items.find((p) => lineMatches(p, item));
      if (match) {
        return items.map((p) => p.id === match.id ? { ...p, quantity: p.quantity + item.quantity } : p);
      }
      newLine = { ...item, id: crypto.randomUUID() };
      return [...items, newLine];
    });
    if (isAuthed) {
      const target = newLine ?? cart.items.find((p) => lineMatches(p, item));
      if (target) addMutation.mutate({ ...target, quantity: (target.quantity ?? 0) + (newLine ? 0 : item.quantity) });
    }
  };

  const remove: CartCtx["remove"] = (id) => {
    setLocalCart((items) => items.filter((i) => i.id !== id));
    if (isAuthed) removeMutation.mutate(id);
  };

  const updateQty: CartCtx["updateQty"] = (id, qty) => {
    const q = Math.max(1, qty);
    let updated: CartItem | undefined;
    setLocalCart((items) => items.map((i) => {
      if (i.id !== id) return i;
      updated = { ...i, quantity: q };
      return updated;
    }));
    if (isAuthed && updated) addMutation.mutate(updated);
  };

  const clear = () => {
    setLocalCart(() => []);
    clearLocal();
    if (isAuthed) {
      // best-effort: remove each line server-side
      cart.items.forEach((i) => removeMutation.mutate(i.id));
    }
  };

  const value = useMemo<CartCtx>(() => ({
    items: cart.items,
    count: cart.totalItems,
    subtotal: cart.totalPrice,
    add, remove, updateQty, clear,
    isLoading: query.isLoading,
  }), [cart, query.isLoading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}

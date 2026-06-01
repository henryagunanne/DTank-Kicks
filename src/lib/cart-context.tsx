// The CartProvider component manages the shopping cart state and synchronizes it 
// between localStorage (for guests) and the server (for authenticated users). 
// It uses React Query to handle data fetching and mutations, providing a seamless experience 
// for both guest and logged-in users. The useCart hook allows components to easily access cart functionality throughout the application.

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
const KEY = "dtank-kicks_cart_v1";
const CART_QK = ["cart"] as const;

// Local cart management for guests. We store an array of CartItems in localStorage under the KEY.
function readLocal(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

// For guests, we store the cart in localStorage. For authenticated users, we sync with the server.
function writeLocal(items: CartItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}

// Clear localStorage cart (e.g. after merging with server on login)
function clearLocal() {
  try { localStorage.removeItem(KEY); } catch {}
}

// Determine if two cart items represent the same line (same product, size, and color)
function lineMatches(a: Pick<CartItem, "productId" | "variantId" | "priceAtAdd">, b: Pick<CartItem, "productId" | "variantId" | "priceAtAdd">) {
  return a.productId === b.productId && a.variantId === b.variantId;
}

// Calculate total items and price for a given array of cart items
function totals(items: CartItem[]): ServerCart {
  return {
    items,
    totalItems: items.reduce((s, i) => s + i.quantity, 0),
    totalPrice: items.reduce((s, i) => s + i.priceAtAdd * i.quantity, 0),
  };
}

// The CartProvider component wraps the application and provides cart state and functions to its children via context.
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

  // Helper to update local cache immediately for a better UX, while the mutations sync with the server in the background.
  const setLocalCart = useCallback((updater: (items: CartItem[]) => CartItem[]) => {
    qc.setQueryData<ServerCart>(CART_QK, (prev) => {
      const next = updater(prev?.items ?? []);
      return totals(next);
    });
  }, [qc]);

  // Mutations for adding/updating and removing items. 
  // On success, they update the cache with the server response. On error, they invalidate the cache to refetch fresh data.
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

  // Cart manipulation functions that update local state immediately and then call the appropriate mutation for authenticated users.
  const add: CartCtx["add"] = (item) => {
    let newLine: CartItem | null = null;
    setLocalCart((items) => {
      const match = items.find((p) => lineMatches(p, item));
      if (match) {
        return items.map((p) => p.id === match.id ? { ...p, quantity: p.quantity + item.quantity } : p);
      }
      newLine = { ...item, id: crypto.randomUUID() };   // generate a temporary ID for the new line item; the server will return the real ID on addOrUpdateItem
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

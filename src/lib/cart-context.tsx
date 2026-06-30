// The CartProvider component manages the shopping cart state and synchronizes it 
// between localStorage (for guests) and the server (for authenticated users). 
// It uses React Query to handle data fetching and mutations, providing a seamless experience 
// for both guest and logged-in users. The useCart hook allows components to easily access cart functionality throughout the application.

import { createContext, useCallback, useContext, useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CartItem } from "./types";
import { useAuth } from "./auth-context";
import { addOrUpdateItem, fetchCart, mergeCart, removeItem,  type ServerCart} from "./cart-api";

interface CartCtx {
  items: CartItem[];
  count: number;
  subtotal: number;
  selectedItems: string[];
  setSelectedItems: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCartItems: CartItem[];
  add: (item: Omit<CartItem, "id">) => void;
  remove: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  removeSelectedItems: (ids: string[]) => void;
  clearCart: () => void;
  isLoading: boolean;
  discount: number;
  setDiscount: React.Dispatch<React.SetStateAction<number>>;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "dtank-kicks_cart_v1";
const SELECTED_KEY = "dtank-kicks_cart_selected_v1";
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
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

// Persist selected item IDs separately so cart selections survive a page reload.
function readSelectedItems(): string[] {
  try {
    const raw = localStorage.getItem(SELECTED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeSelectedItems(selectedItems: string[]) {
  try {
    localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedItems));
  } catch {}
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
  // Load previously persisted selected cart item IDs on init so selections survive reloads.
  const [selectedItems, setSelectedItems] = useState<string[]>(() => readSelectedItems());
  const [discount, setDiscount] = useState(0);
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

  // Persist selected item IDs to localStorage so selections survive reloads.
  useEffect(() => {
    writeSelectedItems(selectedItems);
  }, [selectedItems]);

  // When the user logs out, we want to clear any user-specific cart data from the cache and reset to an empty guest cart.
  useEffect(() => {
    if (isAuthed) return;

    // when user logs out → force reset cart
    qc.setQueryData(CART_QK, {
      items: [],
      totalItems: 0,
      totalPrice: 0,
    });

    // Clear user-specific cart data from cache on logout
    qc.removeQueries({ queryKey: ["cart"] }); 

    clearLocal();
    writeSelectedItems([]); // also clear persisted selection on logout
  }, [isAuthed, qc]);

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

  // The add function adds an item to the cart. It first updates the local state optimistically for a responsive UI, 
  // then triggers a mutation to sync with the server if the user is authenticated. 
  // If the item already exists in the cart (same product, variant, and price), it increments the quantity instead of adding a duplicate line.
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

  // The remove function deletes an item from the cart by its ID. It updates the local state immediately 
  // for responsiveness, and if the user is authenticated, it also triggers a mutation to remove the item from the server.
  const remove: CartCtx["remove"] = (id) => {
    setLocalCart((items) => items.filter((i) => i.id !== id));
    if (isAuthed) removeMutation.mutate(id);
  };

  // The updateQty function updates the quantity of a specific cart item. It ensures that the quantity 
  // is at least 1, updates the local state immediately, and if the user is authenticated, it triggers a mutation to update the item on the server.
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

  // The removeSelectedItems function allows bulk removal of items from the cart based on an array of item IDs. 
  // It updates the local state immediately and then calls the remove mutation for each item if the user is authenticated.
  const removeSelectedItems = (ids: string[]) => {
    setLocalCart((items) => items.filter((i) => !ids.includes(i.id)));
    setDiscount(0); // reset any applied discount when items are removed

    if (isAuthed) {
      ids.forEach((id) => removeMutation.mutate(id));
    } else {
      const updated = readLocal().filter((i) => !ids.includes(i.id));
      writeLocal(updated);
    }
  };

  // The clearCart function empties the entire cart. It clears the local state and localStorage for guests, 
  // and for authenticated users, it attempts to remove each item from the server. This is a best-effort approach; 
  // if the network request fails, the local cart will still be cleared, but the server may still have the old items until the next sync.
  const clearCart = () => {
    setLocalCart(() => []);
    clearLocal();
    setDiscount(0); // reset any applied discount when cart is cleared
    if (isAuthed) {
      // best-effort: remove each line server-side
      cart.items.forEach((i) => removeMutation.mutate(i.id));
    }
  };

  // The selectedCartItems is a derived state that filters the full cart items based on the selected item IDs. 
  // This allows components to easily access only the items that the user has selected for checkout or other actions.
  const selectedCartItems = useMemo(
    () =>
      cart.items.filter((item) =>
        selectedItems.includes(item.id)
      ),
    [cart.items, selectedItems]
  );

  useEffect(() => {
    if (selectedItems.length === 0) return;

    // Remove any selected IDs that no longer exist in the current cart. This keeps persisted selections valid
    // after items are removed or the cart is refreshed.
    const validSelectedItems = selectedItems.filter((itemId) =>
      cart.items.some((item) => item.id === itemId)
    );

    if (validSelectedItems.length !== selectedItems.length) {
      setSelectedItems(validSelectedItems);
    }
  }, [cart.items, selectedItems]);

  const value = useMemo<CartCtx>(() => ({
    items: cart.items,
    count: cart.totalItems,
    subtotal: cart.totalPrice,
    add, remove, updateQty, clearCart, removeSelectedItems,
    isLoading: query.isLoading,
    selectedItems,
    setSelectedItems,
    selectedCartItems,
    discount,
    setDiscount,
  }), [cart, query.isLoading, selectedItems, setSelectedItems, selectedCartItems, discount, setDiscount]);


  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}

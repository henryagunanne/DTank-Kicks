import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchWishlist, toggleWishlist } from "./api";
import { useAuth } from "./auth-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WishlistCtx {
  ids: Set<string>;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
  loading: boolean;
}

interface WishlistItem {
  id: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const Ctx = createContext<WishlistCtx | null>(null);



// ─── Provider ─────────────────────────────────────────────────────────────────

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();

  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery<WishlistItem[]>({
    queryKey: ["wishlist"],
    queryFn: () => fetchWishlist(accessToken ?? undefined),
    enabled: !!user,
  });

  const ids = useMemo(
    () => new Set(data.map((p) => p.id)),
    [data]
  );

  const mutation = useMutation<void, unknown, string, { previous: WishlistItem[] }>({
      mutationFn: (productId: string) => toggleWishlist(productId, true, accessToken ?? undefined),
  
      onMutate: async (productId: string) => {
        await queryClient.cancelQueries({
          queryKey: ["wishlist"],
        });
  
        const previous =
          queryClient.getQueryData<WishlistItem[]>(["wishlist"]) || [];
  
        const exists = previous.some(
          (p) => p.id === productId
        );
  
        queryClient.setQueryData<WishlistItem[]>(
          ["wishlist"],
          exists
            ? previous.filter((p) => p.id !== productId)
            : [...previous, { id: productId }]
        );
  
        return { previous };
      },
  
      onError: (_err, _id, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData<WishlistItem[]>(
            ["wishlist"],
            ctx.previous
          );
        }
      },
  
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: ["wishlist"],
        });
      },
    });
  
    const value = {
      ids,
      has: (id: string) => ids.has(id),
      toggle: (id: string) => {
        mutation.mutate(id);
      },
      count: ids.size,
      loading: isLoading,
    };
  
    return (
      <Ctx.Provider value={value}>
        {children}
      </Ctx.Provider>
    );

}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWishlist() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWishlist must be inside WishlistProvider");
  return c;
}

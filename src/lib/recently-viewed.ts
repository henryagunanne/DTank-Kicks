import { useEffect, useState } from "react";
import type { Product } from "./types";

const KEY = "solestore_recent_v1";

export function pushRecent(p: Product) {
  try {
    const raw = localStorage.getItem(KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = [p.id, ...list.filter((id) => id !== p.id)].slice(0, 4);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("recent-updated"));
  } catch {}
}

export function useRecent(): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(KEY);
        setIds(raw ? JSON.parse(raw) : []);
      } catch { setIds([]); }
    };
    read();
    window.addEventListener("recent-updated", read);
    return () => window.removeEventListener("recent-updated", read);
  }, []);
  return ids;
}

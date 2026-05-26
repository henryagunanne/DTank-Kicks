import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface User { id: string; name: string; email: string; role: "customer" | "admin"; }
interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = "solestore_user_v1";

// Demo-only auth that persists locally. Swap with real API calls when backend is hooked up.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem(KEY, JSON.stringify(u));
    else localStorage.removeItem(KEY);
  };

  const login: AuthCtx["login"] = async (email, password) => {
    if (!email || !password) return { ok: false, error: "Enter your email and password." };
    const isAdmin = email.toLowerCase() === "admin@solestore.com";
    persist({ id: crypto.randomUUID(), name: isAdmin ? "Admin" : email.split("@")[0], email, role: isAdmin ? "admin" : "customer" });
    return { ok: true };
  };
  const register: AuthCtx["register"] = async (name, email, password) => {
    if (!name || !email || password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
    persist({ id: crypto.randomUUID(), name, email, role: "customer" });
    return { ok: true };
  };
  const logout = () => persist(null);

  return <Ctx.Provider value={{ user, login, register, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("AuthProvider missing");
  return c;
};

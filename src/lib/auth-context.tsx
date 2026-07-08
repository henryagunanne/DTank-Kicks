import { createContext, useContext, useEffect, useState, type ReactNode } from "react";


interface Address {
  label?: string;
  name?: string;
  line1?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

interface User { 
  id: string; 
  name: string; 
  email: string; 
  role: "customer" | "admin"; 
  phone?: string;
  addresses?: Address[];
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

// Key used to persist the access token in sessionStorage
// sessionStorage clears when the browser tab closes — safer than localStorage
// We still need to store it somewhere because the httpOnly refresh cookie
// is only used server-side — the frontend needs the access token for API calls
const TOKEN_KEY = "dtank_access";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // true on first load while we check session

  const [accessToken, setAccessToken] = useState<string | null>(
    () => {
      // During server-side rendering `window` and `sessionStorage` are undefined.
      if (typeof window === "undefined" || !window.localStorage) return null;
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    }
  );


  // Helper that saves both user and token together
  const persist = (userData: User, token: string) => {
    setUser(userData);
    setAccessToken(token);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch {
        // ignore storage errors
      }
    }
  };

  // Helper to clear user and token on logout
  const clear = () => {
    setUser(null);
    setAccessToken(null);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        // ignore
      }
    }
  };



  // On app load, check if user already has a valid session
  // Your Express server uses httpOnly cookies for refresh tokens
  // so we ask /api/auth/me to tell us who's logged in
  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      // No stored token — user is definitely not logged in
      setLoading(false);
      return;
    }

    fetch("/api/auth/me", { 
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include" 
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();

          setUser({
            id: data.user.id || data.user._id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            phone: data.user.phone,
            addresses: data.user.addresses,
          });

          setAccessToken(token); // restore token from storage
        } else {
          // Token expired or invalid — clear everything
          clear();
        }
      
      })
      .catch(() => {
        // Server not reachable — clear state but don't crash
        clear();
      })
      .finally(() => setLoading(false));
  }, []);


  // ----------------------------
  // Cross-tab syncing of auth state
  // ----------------------------
  useEffect(() => {
    const syncAuth = (event: StorageEvent) => {
      if (event.key !== TOKEN_KEY) return;

      if (event.newValue) {
        setAccessToken(event.newValue);

        // re-fetch user in new tab
        fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${event.newValue}` },
          credentials: "include",
        })
          .then((res) => res.json())
          .then((data) => {
            setUser({
              id: data.user.id || data.user._id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
              phone: data.user.phone,
              addresses: data.user.addresses,
            });
          })
          .catch(() => clear());
      } else {
        clear(); // logout from another tab
      }
    };

    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);


  // ----------------------------
  // Auth actions
  // ----------------------------
  const login: AuthCtx["login"] = async (email, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // needed so browser stores the httpOnly refresh cookie
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Express sends back { error: "..." } or { message: "..." } on failure
        return { ok: false, error: data.error || data.message || "Login failed" };
      }

      persist({
        id: data.user.id || data.user._id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        phone: data.user.phone,
        addresses: data.user.addresses,
      }, data.access);

      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server. Is it running?" };
    }
  };

  // Register creates a new user account and logs them in automatically. Returns the same shape as login.
  const register: AuthCtx["register"] = async (name, email, password) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error || data.message || "Registration failed" };
      }

      // After registering, the server logs you in automatically
      // and returns the same shape as login
      persist({
        id: data.user.id || data.user._id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        phone: data.user.phone,
        addresses: data.user.addresses,
      }, data.access);

      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server. Is it running?" };
    }
  };


  // Change password allows an authenticated user to change their password by providing the current password and a new password. Validates that the new password is different from the current one.
  const changePassword: AuthCtx["changePassword"] = async (currentPassword, newPassword, confirmPassword) => {
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error || data.message || "Failed to change password" };
      }

      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the server. Is it running?" };
    }
  };


  // Logout clears the local state and also calls the server to clear the httpOnly refresh cookie
  const logout: AuthCtx["logout"] = async () => {
    if (typeof window === "undefined" || !window.localStorage) {
      clear();
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      // No stored token — user is definitely not logged in
      clear();
      return;
    }

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
    } catch {
      // ignore network errors; still clear local state
    } finally {
      clear();
    }
  };

  return (
    <Ctx.Provider value={{ user, loading, accessToken, login, register, changePassword, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("AuthProvider missing");
  return c;
};
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const Ctx = createContext<{ dark: boolean; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("solestore_theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefers;
    setDark(isDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("solestore_theme", dark ? "dark" : "light");
  }, [dark]);

  return <Ctx.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>{children}</Ctx.Provider>;
}

export const useTheme = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("ThemeProvider missing");
  return c;
};

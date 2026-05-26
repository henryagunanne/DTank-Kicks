import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — SoleStore" }] }),
});

function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) { toast.success("Welcome back"); nav({ to: "/account" }); }
    else toast.error(res.error || "Login failed");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">Sign in</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block"><div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</div>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" /></label>
        <label className="block"><div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</div>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" /></label>
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-gold" /> Remember me</label>
          <a href="#" className="text-muted-foreground hover:text-foreground">Forgot password?</a>
        </div>
        <button disabled={loading} className="w-full rounded-full bg-primary py-3 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60">
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <button type="button" onClick={() => toast("Google OAuth (demo)")} className="w-full rounded-full border border-border py-3 text-sm font-semibold">
          Continue with Google
        </button>
        <p className="text-center text-xs text-muted-foreground">No account? <Link to="/register" className="font-semibold text-foreground underline">Register</Link></p>
        <p className="text-center text-[11px] text-muted-foreground">Try <span className="font-mono">admin@solestore.com</span> for admin demo.</p>
      </form>
    </div>
  );
}

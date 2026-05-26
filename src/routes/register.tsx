import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Create an account — SoleStore" }] }),
});

function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Required";
    if (!/.+@.+\..+/.test(f.email)) e.email = "Invalid email";
    if (f.password.length < 8) e.password = "Minimum 8 characters";
    if (f.confirm !== f.password) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const res = await register(f.name, f.email, f.password);
    if (res.ok) { toast.success("Welcome to SoleStore"); nav({ to: "/account" }); }
    else toast.error(res.error || "Registration failed");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">Create account</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {(["name", "email", "password", "confirm"] as const).map((k) => (
          <label key={k} className="block">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {k === "confirm" ? "Confirm password" : k}
            </div>
            <input
              type={k.includes("password") || k === "confirm" ? "password" : k === "email" ? "email" : "text"}
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            {errors[k] && <div className="mt-1 text-xs text-destructive">{errors[k]}</div>}
          </label>
        ))}
        <button className="w-full rounded-full bg-primary py-3 text-sm font-bold uppercase text-primary-foreground">Create account</button>
        <p className="text-center text-xs text-muted-foreground">Have one? <Link to="/login" className="font-semibold text-foreground underline">Sign in</Link></p>
      </form>
    </div>
  );
}

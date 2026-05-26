import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useAuth } from "@/lib/auth-context";
import { PRODUCTS } from "@/lib/data";
import { peso } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  component: AdminPanel,
  head: () => ({ meta: [{ title: "Admin Panel — SoleStore" }] }),
});

function AdminPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"dash" | "products" | "orders" | "customers">("dash");

  if (!user || user.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in as admin@solestore.com to access this panel.</p>
        <Link to="/login" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase text-primary-foreground">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight">Admin Panel</h1>
      <div className="mt-6 flex gap-1 border-b border-border">
        {(["dash", "products", "orders", "customers"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`border-b-2 px-4 py-3 text-sm font-semibold capitalize ${tab === t ? "border-gold" : "border-transparent text-muted-foreground"}`}>
            {t === "dash" ? "Dashboard" : t}
          </button>
        ))}
      </div>
      <div className="mt-8">
        {tab === "dash" && <Dashboard />}
        {tab === "products" && <ProductsTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "customers" && <CustomersTab />}
      </div>
    </div>
  );
}

function Dashboard() {
  const data = Array.from({ length: 30 }).map((_, i) => ({ day: i + 1, revenue: 8000 + Math.round(Math.sin(i / 3) * 4000 + Math.random() * 3000) }));
  const cards = [
    { l: "Revenue (30d)", v: peso(data.reduce((s, d) => s + d.revenue, 0)) },
    { l: "Total Orders", v: "248" },
    { l: "Customers", v: "1,820" },
    { l: "Low Stock Alerts", v: "12", warn: true },
  ];
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.l} className="rounded-xl border border-border p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.l}</div>
            <div className={`mt-2 text-2xl font-black ${c.warn ? "text-destructive" : ""}`}>{c.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-border p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider">Revenue • Last 30 days</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <LineChart data={data}>
              <XAxis dataKey="day" stroke="currentColor" fontSize={11} />
              <YAxis stroke="currentColor" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
              <Line type="monotone" dataKey="revenue" stroke="var(--gold)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ProductsTab() {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">Products ({PRODUCTS.length})</h3>
        <button onClick={() => setShowAdd(true)} className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">+ Add Product</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase">
            <tr><th className="p-3">Image</th><th>Brand</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr>
          </thead>
          <tbody>
            {PRODUCTS.slice(0, 12).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3"><img src={p.images[0]} loading="lazy" className="h-12 w-12 rounded object-cover" alt="" /></td>
                <td>{p.brand}</td><td className="font-medium">{p.name}</td><td>{p.category}</td>
                <td>{peso(p.price)}</td>
                <td>{p.sizes.reduce((s, x) => s + x.stock, 0)}</td>
                <td className="space-x-2 text-xs">
                  <button className="text-blue-600 hover:underline">Edit</button>
                  <button className="text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAdd(false)}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6">
            <h3 className="text-lg font-bold">Add Product</h3>
            <form className="mt-4 grid gap-3 text-sm">
              <input placeholder="Name" className="h-10 rounded-md border border-input bg-background px-3" />
              <input placeholder="Brand" className="h-10 rounded-md border border-input bg-background px-3" />
              <input placeholder="Category" className="h-10 rounded-md border border-input bg-background px-3" />
              <input placeholder="Price" type="number" className="h-10 rounded-md border border-input bg-background px-3" />
              <input placeholder="Sizes (comma)" className="h-10 rounded-md border border-input bg-background px-3" />
              <input placeholder="Colors (comma)" className="h-10 rounded-md border border-input bg-background px-3" />
              <input type="file" accept="image/*" />
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAdd(false)} className="rounded-md border border-border px-4 py-2">Cancel</button>
                <button type="button" onClick={() => setShowAdd(false)} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersTab() {
  const rows = Array.from({ length: 8 }).map((_, i) => ({
    id: "SS-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    customer: ["Marco S.", "Jen L.", "Rico D.", "Aria M."][i % 4],
    total: 3000 + i * 850,
    status: ["Processing", "Shipped", "Delivered"][i % 3],
  }));
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-left text-xs uppercase">
          <tr><th className="p-3">Order</th><th>Customer</th><th>Total</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="p-3 font-mono">{r.id}</td>
              <td>{r.customer}</td>
              <td>{peso(r.total)}</td>
              <td>
                <select defaultValue={r.status} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                  <option>Processing</option><option>Shipped</option><option>Delivered</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomersTab() {
  const rows = [
    { name: "Marco Santos", email: "marco@example.com", orders: 12, spend: 84300 },
    { name: "Jenny Lopez", email: "jen@example.com", orders: 8, spend: 56120 },
    { name: "Rico Diaz", email: "rico@example.com", orders: 5, spend: 27450 },
  ];
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-left text-xs uppercase">
          <tr><th className="p-3">Name</th><th>Email</th><th>Orders</th><th>Total Spend</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.email} className="border-t border-border">
              <td className="p-3 font-medium">{r.name}</td>
              <td className="text-muted-foreground">{r.email}</td>
              <td>{r.orders}</td>
              <td className="font-semibold">{peso(r.spend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

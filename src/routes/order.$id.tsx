import { createFileRoute } from "@tanstack/react-router";
import { Check, Package, Truck, Home } from "lucide-react";

export const Route = createFileRoute("/order/$id")({
  component: TrackingPage,
  head: ({ params }) => ({ meta: [{ title: `Track ${params.id} — SoleStore` }] }),
});

function TrackingPage() {
  const { id } = Route.useParams();
  const now = Date.now();
  const stages = [
    { label: "Order Placed", icon: Check, ts: now - 86400000 * 3, done: true },
    { label: "Processing", icon: Package, ts: now - 86400000 * 2, done: true },
    { label: "Shipped", icon: Truck, ts: now - 86400000, done: true },
    { label: "Delivered", icon: Home, ts: now + 86400000 * 2, done: false },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight">Track your order</h1>
      <div className="mt-2 text-sm text-muted-foreground">Order <span className="font-mono font-semibold">{id}</span></div>

      <div className="mt-10 rounded-xl border border-border p-6">
        <div className="mb-2 text-xs uppercase text-muted-foreground">Carrier</div>
        <div className="flex items-center justify-between">
          <div className="font-semibold">LBC Express</div>
          <div className="font-mono text-sm">TRK-{id}</div>
        </div>
      </div>

      <div className="mt-10">
        <div className="relative flex justify-between">
          <div className="absolute left-6 right-6 top-6 h-1 rounded bg-border" />
          <div className="absolute left-6 top-6 h-1 rounded bg-gold" style={{ width: "calc(66% - 1.5rem)" }} />
          {stages.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="relative z-10 flex w-1/4 flex-col items-center text-center">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-background ${s.done ? "bg-gold text-gold-foreground" : "bg-secondary text-muted-foreground"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-xs font-bold">{s.label}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{new Date(s.ts).toLocaleDateString()}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

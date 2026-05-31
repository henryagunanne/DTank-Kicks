import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

import { useAuth } from "@/lib/auth-context";
import { fetchProducts, createProduct, updateProduct, deleteProduct, fetchAllOrders, fetchAdminDashboard, updateOrderStatus, fetchAllCustomers } from "@/lib/admin-api";
import { peso } from "@/lib/format";
import { toast } from "sonner";


export const Route = createFileRoute("/admin")({
  component: AdminPanel,
  head: () => ({ meta: [{ title: "Admin Panel — DTank Kicks" }] }),
});

function AdminPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"dash" | "products" | "orders" | "customers">("dash");

  if (!user || user.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in using your admin credentials to access this panel.</p>
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
  const { accessToken } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetchAdminDashboard(accessToken),
  });

  const cards = [
    { l: "Revenue (30d)", v: peso(stats?.revenue30d ?? 0), },
    { l: "Total Orders", v: stats?.totalOrders ?? 0, },
    { l: "Customers", v: stats?.customers ?? 0, },
    { l: "Low Stock Alerts", v: stats?.lowStock ?? 0, warn: true, },
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
            <LineChart data={stats?.revenueChart ?? []}>
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
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  // Form state for adding/editing products
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [sizes, setSizes] = useState([{ size: "", stock: "" }]);
  const [colors, setColors] = useState([{ name: "", hex: "#000000" }]);

  const { data, isLoading } = useQuery({ 
    queryKey: ["admin-products"], 
    queryFn: () => fetchProducts({ limit: 1000,})
  });

  const products = data?.items ?? [];

  // Mutation for deleting a product
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id, accessToken),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-products"],
      });

      toast.success("Product deleted successfully");
    },

    onError: () => {
      toast.error("Failed to delete product");
    },
  });


  // Mutation for creating a new product
  const createMutation = useMutation({
    mutationFn: (formData: FormData) => createProduct(formData, accessToken),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-products"],
      });

      setShowAdd(false);
      toast.success("Product created successfully");
    },
    onError: () => {
      toast.error("Failed to create product");
    },
  });

  // Handler for creating a new product - gathers form data and calls the createProduct mutation
  const handleCreate = () => {
    const formData = new FormData();

    formData.append("name", name);
    formData.append("brand", brand);
    formData.append("category", category);
    formData.append("price", price);

    images.forEach((file) => {
      formData.append("images", file);
    });

    createMutation.mutate(formData);
  };

  

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">Products ({products.length})</h3>
        <button onClick={() => setShowAdd(true)} className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">+ Add Product</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase">
            <tr>
              <th className="p-3">Image</th>
              <th>Brand</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3"><img src={p.images[0]} loading="lazy" className="h-12 w-12 rounded object-cover" alt="" /></td>
                <td>{p.brand}</td><td className="font-medium">{p.name}</td><td>{p.category}</td>
                <td>{peso(p.price)}</td>
                <td>{p.sizes.reduce((s, x) => s + x.stock, 0)}</td>
                <td className="space-x-2 text-xs">
                  <button className="text-blue-600 hover:underline">Edit</button>
                  <button  onClick={() => deleteMutation.mutate(p.id)} className="text-destructive hover:underline">Delete</button>
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
              <input placeholder="Name" onChange={(e) => setName(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3" />
              <input placeholder="Brand" onChange={(e) => setBrand(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3" />
              <input placeholder="Category" onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3" />
              <input placeholder="Price" type="number" onChange={(e) => setPrice(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3" />
              <div>
                <label className="mb-2 block font-medium">Sizes & Stock</label>
                <div className="space-y-2">{sizes.map((s, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Size"
                        value={s.size}
                        onChange={(e) => {
                          const next = [...sizes];
                          next[index].size = e.target.value;
                          setSizes(next);
                        }}
                        className="h-10 flex-1 rounded-md border border-input bg-background px-3"
                      />

                      <input
                        type="number"
                        placeholder="Stock"
                        value={s.stock}
                        onChange={(e) => {
                          const next = [...sizes];
                          next[index].stock = e.target.value;
                          setSizes(next);
                        }}
                        className="h-10 flex-1 rounded-md border border-input bg-background px-3"
                      />

                      <button type="button" onClick={() => setSizes(sizes.filter((_, i) => i !== index))} className="px-3">✕</button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="mt-2 text-sm text-blue-600"
                  onClick={() => setSizes([...sizes,{size: "", stock: ""},])}
                >
                  + Add Size
                </button>
              </div>

              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setImages(files.slice(0, 6)); // Limit to 6 images
                }}
                multiple 
                aria-label="Product Images" />
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAdd(false)} className="rounded-md border border-border px-4 py-2">Cancel</button>
                <button type="button" onClick={handleCreate} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersTab() {
  const {accessToken} = useAuth();
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchAllOrders(accessToken || ""),
  });

  const updateStatus = useMutation({
    mutationFn: (input: { orderId: string; status: string }) => updateOrderStatus(input.orderId, input.status, accessToken || ""),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-orders"],
      });

      toast.success("Order status updated");
    },
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-left text-xs uppercase">
          <tr>
            <th className="p-3">Order</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id} className="border-t border-border">
              <td className="p-3 font-mono">{order._id}</td>
              <td>{order.user?.name || "Guest"}</td>
              <td>{peso(order.total)}</td>
              <td>
                <select 
                  aria-label="Order Status" 
                  defaultValue={order.status} 
                  onChange={(e) => {
                    updateStatus.mutate({ 
                      orderId: order._id, 
                      status: e.target.value 
                    })
                  }} 
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="placed">Placed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
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
  const { accessToken } = useAuth();

  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fetchAllCustomers(accessToken || ""),
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-left text-xs uppercase">
          <tr>
            <th className="p-3">Name</th>
            <th>Email</th>
            <th>Orders</th>
            <th>Total Spend</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.email} className="border-t border-border">
              <td className="p-3 font-medium">{customer.name}</td>
              <td className="text-muted-foreground">{customer.email}</td>
              <td>{customer.orders}</td>
              <td className="font-semibold">{peso(customer.spend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

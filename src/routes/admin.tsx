import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

import { useAuth } from "@/lib/auth-context";
import { createProduct, updateProduct, deleteProduct, fetchAllOrders, fetchAdminDashboard, updateOrderStatus, fetchAllCustomers } from "@/lib/admin-api";
import { fetchProducts } from "@/lib/product-api";
import { peso } from "@/lib/format";
import { toast } from "sonner";
import type { Product } from "@/lib/types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";


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
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Variants are an array of objects with size, colorName, colorHex, and stock properties.
  // This allows us to manage multiple variants of a product (e.g. different sizes and colors) in the form.
  const [variants, setVariants] = useState([
    {
      size: "",
      colorName: "",
      colorHex: "#000000",
      price: "",
      compareAtPrice: "",
      stock: "",
    },
  ]);

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


  // Mutation for updating an existing product
  const updateMutation = useMutation({
    mutationFn: ({id, formData}: {id: string; formData: FormData;}) => updateProduct(id, formData, accessToken),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "admin-products",
        ],
      });

      setShowAdd(false);
      setEditingProduct(null);
      toast.success("Product updated successfully");
    },
    onError: () => {
      toast.error("Failed to update product");
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
    console.log("editingProduct", editingProduct);
    const formData = new FormData();

    formData.append("name", name);
    formData.append("brand", brand);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("tags", tags);

    formData.append(
      "variants",
      JSON.stringify(
        variants.map((v) => ({
          size: Number(v.size),
          color: {
            name: v.colorName,
            hex: v.colorHex,
          },
          price:  Number(v.price),
          compareAtPrice: v.compareAtPrice ?  Number(v.compareAtPrice) : undefined,
          stock: Number(v.stock),
        }))
      )
    );

    images.forEach((file) => {
      formData.append("images", file);
    });


    if (editingProduct) {
      updateMutation.mutate({id: editingProduct.id, formData});
    } else {
      createMutation.mutate(formData);
    }
  };

  // When the user clicks "Edit" on a product, we populate the form with that product's data and show the modal. 
  // This allows the admin to easily update existing products.
  const openEdit = (p: Product) => {
    setShowAdd(false);  // First close the modal to reset the form state, then after a short delay populate it with the product data and reopen it. This ensures that the form is properly reset when switching between products.

    setEditingProduct(p);

    setName(p.name); 
    setBrand(p.brand || "");
    setCategory(p.category || "");
    setDescription(p.description);
    setTags((p.tags || []).join(", "));

    setVariants(
      p.variants.map((v: any) => ({
        size: String(v.size),
        colorName: v.color?.name || "",
        colorHex: v.color?.hex || "#000000",
        price: v.price,
        compareAtPrice: v.compareAtPrice ? v.compareAtPrice : "",
        stock: String(v.stock),
      }))
    );

    setShowAdd(true);
  };


  // Handler for updating a specific field of a variant in the variants array.
  const updateVariant = (i: number, field: string, value: any) => {
    setVariants((prev) =>
      prev.map((v, idx) =>
        idx === i ? { ...v, [field]: value } : v
      )
    );
  };

  // Handler for removing a variant from the variants array. 
  // This allows the admin to manage multiple variants of a product and remove them as needed.
  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // construct the image source depending on whether the image file starts with "http" or "/uploads" (indicating it's a local file that needs the API base URL prefixed)
  const getImageSrc = (img: string) => {
    if (img.startsWith("http")) {
      return img;
    } else if (img.startsWith("/uploads")) {
      return `${API_BASE}${img}`;
    } else {
      return img;
    }
  };

  return (
    <div>
      {/* HEADER with Add Product button */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">Products ({products.length})</h3>
        <button onClick={() => setShowAdd(true)} className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">+ Add Product</button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase">
            <tr>
              <th className="p-3">Image</th>
              <th>Brand</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock (total)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3"><img src={getImageSrc(p.images[0])} loading="lazy" className="h-12 w-12 rounded object-cover" alt={p.name} /></td>
                <td>{p.brand}</td>
                <td className="font-medium">{p.name}</td>
                <td>{p.category}</td>
                <td>{peso(p.minPrice)} - {peso(p.maxPrice)}</td>
                <td>{p.sizes.reduce((s, x) => s + x.stock, 0)}</td>
                <td className="space-x-2 text-xs">
                  <button onClick={() => { openEdit(p);}} className="text-blue-600 hover:underline">Edit</button>
                  <button  onClick={() => deleteMutation.mutate(p.id)} className="text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAdd(false)}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6">
            <h3 className="text-lg font-bold">Add Product</h3>
            <form className="mt-4 grid gap-3 text-sm">
              <input value={name} placeholder="Name" onChange={(e) => setName(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3" />
              <input value={brand} placeholder="Brand" onChange={(e) => setBrand(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3" />
              <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3">
                <option value="">Select category</option>
                <option value="Sneakers">Sneakers</option>
                <option value="Boots">Boots</option>
                <option value="Formal">Formal</option>
                <option value="Sports">Sports</option>
                <option value="Sandals">Sandals</option>
              </select>
              <input value={tags} placeholder="Tags (comma separated)" onChange={(e) => setTags(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3" />

              <textarea value={description} placeholder="Description" onChange={(e) => setDescription(e.target.value)} className="h-20 rounded-md border border-input bg-background px-3" />

              {/* VARIANTS */}
              <div className="space-y-2">
                <h4 className="font-bold">Variants</h4>

                {variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-6 gap-2">
                    <input aria-label="Size" placeholder="Size" type="number" className="h-10 rounded-md border border-input bg-background px-3"
                      value={v.size}
                      onChange={(e) => updateVariant(i, "size", e.target.value)}
                    />

                    <input aria-label="Color Name" placeholder="Color" className="h-10 rounded-md border border-input bg-background px-3"
                      value={v.colorName}
                      onChange={(e) => updateVariant(i, "colorName", e.target.value)}
                    />

                    <input type="color" aria-label="Color Hex" className="h-10 rounded-md border border-input bg-background px-3"
                      value={v.colorHex}
                      onChange={(e) => {updateVariant(i, "colorHex", e.target.value)}} 
                    />

                    <input placeholder="Price" type="number" className="h-10 rounded-md border border-input bg-background px-3" 
                      value={v.price}
                      onChange={(e) => {updateVariant(i, "price", e.target.value)}} 
                    />
                    <input placeholder="Compare At Price" type="number" className="h-10 rounded-md border border-input bg-background px-3"
                      value={v.compareAtPrice}
                      onChange={(e) => {updateVariant(i, "compareAtPrice", e.target.value)}} 
                    />

                    <input value={v.stock} placeholder="Stock" type="number"
                      onChange={(e) => {updateVariant(i, "stock", e.target.value)}}
                      className="h-10 rounded-md border border-input bg-background px-3"
                    />

                    {/* REMOVE BUTTON */}
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      disabled={variants.length === 1}
                      className="h-10 rounded-md border border-red-500 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button type="button" onClick={() => setVariants([...variants, { size: "", colorName: "", colorHex: "#000000", price: "", compareAtPrice: "", stock: "" },])} className="text-blue-600 text-sm">
                  + Add Variant
                </button>
              </div>

              <input type="file" accept="image/*" multiple  aria-label="Product Images"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setImages(files.slice(0, 10)); // Limit to 10 images
                }} 
               />
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

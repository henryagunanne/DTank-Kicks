import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

import { useAuth } from "@/lib/auth-context";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  fetchAllOrders,
  fetchAdminDashboard,
  updateOrderStatus,
  fetchAllCustomers,
  approveReturnRequest,
  issueRefund,
  inspectReturn,
  uploadInspectionPhotos,
} from "@/lib/admin-api";
import { fetchProducts } from "@/lib/product-api";
import { USD } from "@/lib/format";
import { toast } from "sonner";
import type { Product } from "@/lib/types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";


export const Route = createFileRoute("/admin")({
  component: AdminPanel,
  head: () => ({ meta: [{ title: "Admin Panel — DTank Kicks" }] }),
});

function AdminPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"dash" | "products" | "orders" | "returns" | "customers">("dash");

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
        {(["dash", "products", "orders", "returns", "customers"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`border-b-2 px-4 py-3 text-sm font-semibold capitalize ${tab === t ? "border-gold" : "border-transparent text-muted-foreground"}`}>
            {t === "dash" ? "Dashboard" : t === "returns" ? "Returns" : t}
          </button>
        ))}
      </div>
      <div className="mt-8">
        {tab === "dash" && <Dashboard />}
        {tab === "products" && <ProductsTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "returns" && <ReturnsTab />}
        {tab === "customers" && <CustomersTab />}
      </div>
    </div>
  );
}

// Render inspection modal controlled by ReturnsTab state
// Note: uses functions and state declared inside ReturnsTab via closure
// The modal invocation will be inserted when ReturnsTab is rendered.

/* Inspection Modal - rendered by ReturnsTab when `inspectionOpen` is true */
function InspectionModal({ open, onClose, condition, setCondition, notes, setNotes, files, setFiles, restock, setRestock, onSubmit, uploading }: any) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card p-6">
        <h3 className="text-lg font-bold">Record Return Inspection</h3>
        <div className="mt-4 grid gap-3 text-sm">
          <label className="flex flex-col">
            <span className="text-xs text-muted-foreground">Condition</span>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="mt-1 h-10 rounded-md border border-input bg-background px-3">
              <option value="new">New</option>
              <option value="like_new">Like new</option>
              <option value="worn">Worn</option>
              <option value="damaged">Damaged</option>
              <option value="defective">Defective</option>
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-muted-foreground">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 h-28 rounded-md border border-input bg-background px-3 py-2" />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-muted-foreground">Photos</span>
            <input type="file" accept="image/*" multiple onChange={(e) => {
              const f = Array.from(e.target.files || []);
              setFiles(f.slice(0, 8));
            }} className="mt-2 text-xs" />

            <div className="mt-2 flex flex-wrap gap-2">
              {files.map((file: File, i: number) => (
                <img key={i} src={URL.createObjectURL(file)} alt={file.name} className="h-16 w-16 rounded object-cover" />
              ))}
            </div>
          </label>

          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
            <span className="text-sm">Restock items to inventory</span>
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2">Cancel</button>
            <button type="button" onClick={onSubmit} disabled={uploading} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">{uploading ? "Recording..." : "Record Inspection"}</button>
          </div>
        </div>
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
    { l: "Revenue (30d)", v: USD(stats?.revenue30d ?? 0), },
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

  const emptyVariant = {
    size: "",
    colorName: "",
    colorHex: "#000000",
    price: "",
    compareAtPrice: "",
    stock: "",
  };

  const resetForm = () => {
    setEditingProduct(null);

    setName("");
    setBrand("");
    setCategory("");
    setDescription("");
    setTags("");

    setImages([]);

    setVariants([emptyVariant]);
  };

  const closeModal = () => {
    setShowAdd(false);
    resetForm();
  };

  const { data } = useQuery({ 
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

      closeModal();
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

      closeModal();
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
    closeModal();  // First close the modal to reset the form state, then after a short delay populate it with the product data and reopen it. This ensures that the form is properly reset when switching between products.

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
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">+ Add Product</button>
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
                <td>{USD(p.minPrice)} - {USD(p.maxPrice)}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeModal}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6">
            <h3 className="text-lg font-bold">{editingProduct ? "Edit Product" : "Add Product"}</h3>
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
                <button type="button" onClick={closeModal} className="rounded-md border border-border px-4 py-2">Cancel</button>
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
    enabled: !!accessToken,
  });

  const updateStatus = useMutation({
    mutationFn: (input: { orderId: string; status: string }) => {
      if (!accessToken) throw new Error("Admin authentication required");
      return updateOrderStatus(input.orderId, input.status, accessToken);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-orders"],
      });

      toast.success("Order status updated");
    },
    onError: (err) => { 
      console.error(err);
      toast.error("Failed to update order status");
    }
  });

  const approveReturn = useMutation({
    mutationFn: ({ orderId, refundAmount }: { orderId: string; refundAmount?: number }) => {
      if (!accessToken) throw new Error("Admin authentication required");
      return approveReturnRequest(orderId, { refundAmount }, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Return approved");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to approve return");
    },
  });

  const refundMutation = useMutation({
    mutationFn: ({ orderId, refundAmount }: { orderId: string; refundAmount?: number }) => {
      if (!accessToken) throw new Error("Admin authentication required");
      return issueRefund(orderId, { refundAmount }, accessToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Stripe refund issued");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to issue refund");
    },
  });

  const inspectMutation = useMutation({
    mutationFn: ({ returnId, restock, inspection }: { returnId: string; restock: boolean; inspection?: any }) => inspectReturn(returnId, { restock, inspection }, accessToken || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Inspection recorded");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record inspection");
    },
  });

  

  // Inspection modal state
  

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-left text-xs uppercase">
          <tr>
            <th className="p-3">Order</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id} className="border-t border-border align-top">
              <td className="p-3 font-mono">{order._id}</td>
              <td>{order.user?.name || order.guestEmail || "Guest"}</td>
              <td>{USD(order.total)}</td>
              <td className="capitalize text-xs text-muted-foreground">{order.paymentStatus || "pending"}</td>
              <td>
                <select 
                  aria-label="Order Status" 
                  value={order.status || order.fulfillmentStatus || "placed"} 
                  onChange={(e) => {
                    updateStatus.mutate({ 
                      orderId: order._id, 
                      status: e.target.value 
                    });
                  }} 
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="pending">Pending</option>
                  <option value="processing payment">Processing Payment</option>
                  <option value="paid">Paid</option>
                  <option value="packing">Packing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="return requested">Return Requested</option>
                  <option value="return approved">Return Approved</option>
                  <option value="return rejected">Return Rejected</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                  <option value="payment failed">Payment Failed</option>
                </select>
              </td>
              <td className="space-y-2 py-3">
                {order.returnRequest?.status === "requested" && (
                  <button
                    onClick={() => approveReturn.mutate({ orderId: order._id, refundAmount: order.returnRequest?.refundAmount || order.total })}
                    className="block rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700"
                  >
                    Approve Return
                  </button>
                )}
                {(order.returnRequest?.status === "approved" || order.paymentStatus === "pending_refund") && (
                  <button
                    onClick={() => refundMutation.mutate({ orderId: order._id, refundAmount: order.returnRequest?.refundAmount || order.total })}
                    className="block rounded-md border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700"
                  >
                    Issue Stripe Refund
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function ReturnsTab() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchAllOrders(accessToken || ""),
    enabled: !!accessToken,
  });

  const normalizeProductId = (value: any) => String(value?._id ?? value?.id ?? value ?? "");
  const getItemKey = (item: any) => {
    const productId = normalizeProductId(item?.product ?? item?.productId ?? item?.product_id);
    const variantId = String(item?.variantId ?? item?.variant ?? "");
    return `${productId}-${variantId}`;
  };

  const approveReturnMutation = useMutation({
    mutationFn: ({ orderId, refundAmount, items }: { orderId: string; refundAmount: number; items?: any[] }) =>
      approveReturnRequest(orderId, { refundAmount, items }, accessToken || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Return approved");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to approve return");
    },
  });

  const refundMutation = useMutation({
    mutationFn: ({ orderId, refundAmount, items }: { orderId: string; refundAmount: number; items?: any[] }) =>
      issueRefund(orderId, { refundAmount, items }, accessToken || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Refund issued");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to issue refund");
    },
  });

  const inspectMutation = useMutation({
    mutationFn: ({ returnId, restock, inspection }: { returnId: string; restock: boolean; inspection?: any }) =>
      inspectReturn(returnId, { restock, inspection }, accessToken || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Inspection recorded");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record inspection");
    },
  });

  // Inspection modal state (local to ReturnsTab)
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectingReturnId, setInspectingReturnId] = useState<string | null>(null);
  const [inspectionCondition, setInspectionCondition] = useState<string>("new");
  const [inspectionNotes, setInspectionNotes] = useState<string>("");
  const [inspectionFiles, setInspectionFiles] = useState<File[]>([]);
  const [inspectionRestock, setInspectionRestock] = useState<boolean>(false);
  const [uploading, setUploading] = useState(false);

  const openInspectionModal = (returnId: string, defaultRestock = false) => {
    setInspectingReturnId(returnId);
    setInspectionRestock(defaultRestock);
    setInspectionCondition("new");
    setInspectionNotes("");
    setInspectionFiles([]);
    setInspectionOpen(true);
  };

  const closeInspectionModal = () => {
    setInspectionOpen(false);
    setInspectingReturnId(null);
    setUploading(false);
  };

  const handleInspectionSubmit = async () => {
    if (!inspectingReturnId) return;
    try {
      setUploading(true);
      let photoPaths: string[] = [];
      if (inspectionFiles.length > 0) {
        photoPaths = await uploadInspectionPhotos(inspectionFiles, accessToken || null);
      }

      const inspectionPayload = { condition: inspectionCondition, notes: inspectionNotes, photos: photoPaths };

      inspectMutation.mutate({ returnId: inspectingReturnId, restock: inspectionRestock, inspection: inspectionPayload });
      closeInspectionModal();
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload inspection photos");
      setUploading(false);
    }
  };

  const pendingReturns = orders.filter((order: any) =>
    order.returnRequest?.status === "requested" ||
    order.returnRequest?.status === "approved" ||
    order.paymentStatus === "pending_refund" ||
    (Array.isArray(order.returnedItems) && order.returnedItems.length > 0)
  );

  return (
    <div className="space-y-4">
      <InspectionModal
        open={inspectionOpen}
        onClose={closeInspectionModal}
        condition={inspectionCondition}
        setCondition={setInspectionCondition}
        notes={inspectionNotes}
        setNotes={setInspectionNotes}
        files={inspectionFiles}
        setFiles={setInspectionFiles}
        restock={inspectionRestock}
        setRestock={setInspectionRestock}
        onSubmit={handleInspectionSubmit}
        uploading={uploading || (inspectMutation as any).isLoading}
      />
      {pendingReturns.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">No return or refund activity to review.</div>
      ) : (
        pendingReturns.map((order: any) => {
          const items = Array.isArray(order.items) ? order.items : [];
          const returnedKeys = new Set([
            ...(Array.isArray(order.returnedItems) ? order.returnedItems : []).map((item: any) => getItemKey(item)),
            ...(Array.isArray(order.returnRequest?.returnItems) ? order.returnRequest.returnItems : []).map((item: any) => getItemKey(item)),
          ]);
          const pendingItems = items.filter((item: any) => !returnedKeys.has(getItemKey(item)));
          const totalRefundAmount = items
            .filter((item: any) => returnedKeys.has(getItemKey(item)))
            .reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);

          return (
            <div key={order._id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-bold">Order {order._id}</div>
                  <div className="text-xs text-muted-foreground">{order.user?.name || order.guestEmail || "Guest"}</div>
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{order.returnRequest?.status || order.paymentStatus || "No return"}</div>
              </div>

              <div className="mt-3 space-y-2">
                {items.map((item: any) => {
                  const itemKey = getItemKey(item);
                  const isReturned = returnedKeys.has(itemKey);
                  return (
                    <div key={`${order._id}-${itemKey}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.color} • Size {item.size}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isReturned ? <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Returned</span> : <span className="rounded bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Eligible</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {order.returnRequest?.status === "requested" && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-3">
                  <div className="text-sm">
                    <div className="font-semibold text-amber-800">Return requested</div>
                    <div className="text-xs text-amber-700">{order.returnRequest.reason || "Customer requested a return."}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => approveReturnMutation.mutate({
                      orderId: order._id,
                      refundAmount: Number(order.returnRequest?.refundAmount || order.total || 0),
                      items: Array.isArray(order.returnRequest?.returnItems) ? order.returnRequest.returnItems : items,
                    })}
                    className="rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-700"
                  >
                    {(approveReturnMutation as any).isLoading ? "Approving..." : "Approve Return"}
                  </button>
                </div>
              )}

              {(order.returnRequest?.status === "approved" || order.paymentStatus === "pending_refund") && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-green-50 p-3">
                  <div className="text-sm">
                    <div className="font-semibold text-green-800">Approved for refund</div>
                    <div className="text-xs text-green-700">Refund due: {USD(Number(order.returnRequest?.refundAmount || totalRefundAmount || order.total || 0))}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openInspectionModal(order.returnRequest?._id || order._id)}
                      className="rounded-md border border-sky-300 bg-white px-3 py-2 text-xs font-semibold text-sky-700"
                    >
                      {(inspectMutation as any).isLoading ? "Recording..." : "Record Inspection"}
                    </button>
                    <button
                      type="button"
                      onClick={() => refundMutation.mutate({
                        orderId: order._id,
                        refundAmount: Number(order.returnRequest?.refundAmount || totalRefundAmount || order.total || 0),
                        items: Array.isArray(order.returnRequest?.returnItems) ? order.returnRequest.returnItems : items,
                      })}
                      className="rounded-md border border-green-300 bg-white px-3 py-2 text-xs font-semibold text-green-700"
                    >
                      {(refundMutation as any).isLoading ? "Refunding..." : "Issue Refund"}
                    </button>
                  </div>
                </div>
              )}

              {pendingItems.length > 0 && (
                <div className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                  {pendingItems.length} item{pendingItems.length > 1 ? "s" : ""} still available for a future return request.
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function CustomersTab() {
  const { accessToken } = useAuth();

  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fetchAllCustomers(accessToken || ""),
    enabled: !!accessToken,
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
              <td className="font-semibold">{USD(customer.spend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

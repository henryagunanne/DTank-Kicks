require("dotenv").config();
const bcrypt = require("bcrypt");
const connectDB = require("./config/db");
const User = require("./models/User");
const Product = require("./models/Product");
const Order = require("./models/Order");

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
const SIZES = [4,5,6,7,8,9,10,11,12,13,14,15];
const stockArr = (pat) => SIZES.map((s, i) => ({ size: s, stock: pat[i % pat.length] }));
const C = {
  black: { name: "Black", hex: "#111111" }, white: { name: "White", hex: "#f5f5f5" },
  gray: { name: "Gray", hex: "#9ca3af" }, red: { name: "Red", hex: "#dc2626" },
  blue: { name: "Blue", hex: "#1e40af" }, green: { name: "Green", hex: "#15803d" },
  tan: { name: "Tan", hex: "#b08968" }, brown: { name: "Brown", hex: "#6b3a18" }, gold: { name: "Gold", hex: "#d4af37" },
};
const photos = ["photo-1542291026-7eec264c27ff","photo-1606107557195-0e29a4b5b4aa","photo-1595950653106-6c9ebd614d3a","photo-1533681904393-9ab6eee7e408","photo-1539185441755-769473a23570","photo-1603487742131-4160ec999306","photo-1600185365926-3a2ce3cdb9eb","photo-1551107696-a4b0c5a0d9a2","photo-1560769629-975ec94e6a86","photo-1491553895911-0055eca6402d","photo-1620799140408-edc6dcb6d633","photo-1551116322-f8e8a96f9569"];

const products = [
  ["Nike","Sneakers","Air Pulse 270",7995,[C.black,C.white,C.red]],
  ["Adidas","Sneakers","Ultraboost Drift",9450,[C.white,C.black,C.blue]],
  ["Puma","Sports","Velocity Nitro 3",6750,[C.blue,C.black]],
  ["New Balance","Sneakers","990v6 Heritage",12500,[C.gray,C.black]],
  ["Vans","Sneakers","Old Skool Classic",4250,[C.black,C.white]],
  ["Converse","Sneakers","Chuck 70 Hi",4895,[C.white,C.black,C.red]],
  ["Nike","Sports","ZoomX Streakfly",8950,[C.gold,C.black]],
  ["Adidas","Sports","Adizero Boston 12",7995,[C.white,C.blue]],
  ["Puma","Sneakers","Suede Classic XXI",4995,[C.red,C.black,C.white]],
  ["New Balance","Sports","Fresh Foam 1080",9250,[C.black,C.gray]],
  ["Vans","Sneakers","Sk8-Hi Reissue",4850,[C.black,C.white]],
  ["Converse","Sneakers","Run Star Motion",6450,[C.white,C.black]],
  ["Nike","Boots","ACG Goretex Trail",11250,[C.brown,C.black]],
  ["Adidas","Boots","Terrex Free Hiker",13500,[C.black,C.tan]],
  ["Puma","Formal","Tazon Leather Oxford",5950,[C.black,C.brown]],
  ["New Balance","Formal","Numeric Derby",6750,[C.brown,C.black]],
  ["Vans","Sandals","Hi-Standard Sandal",2950,[C.black,C.tan]],
  ["Converse","Sandals","Run Star Slide",3450,[C.white,C.black]],
  ["Nike","Sandals","Calm Slide",2750,[C.black,C.gray]],
  ["Adidas","Sandals","Adilette Comfort",2450,[C.black,C.white]],
  ["Puma","Boots","Tactical Mid",8450,[C.black,C.brown]],
  ["Nike","Formal","Killshot Premium",7250,[C.white,C.green]],
  ["Adidas","Formal","Stan Smith Lux",6950,[C.white,C.gold]],
  ["New Balance","Boots","Rainier Trail Boot",10950,[C.brown,C.tan]],
];

async function run() {
  await connectDB();
  await Promise.all([User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({})]);

  const adminHash = await bcrypt.hash("Admin1234!", 12);
  const customerHash = await bcrypt.hash("Customer1234!", 12);
  const admin = await User.create({ name: "Admin", email: "admin@dtank-kicks.com", passwordHash: adminHash, role: "admin" });
  const c1 = await User.create({ name: "Marco Santos", email: "marco@example.com", passwordHash: customerHash, phone: "+639171234567" });
  const c2 = await User.create({ name: "Jenny Lopez", email: "jen@example.com", passwordHash: customerHash, phone: "+639179876543" });

  const created = await Product.insertMany(products.map(([brand, category, name, price, colors], i) => ({
    name, brand, category, price,
    compareAtPrice: i % 4 === 0 ? Math.round(price * 1.25) : undefined,
    description: "Premium engineered upper, cushioned midsole, durable rubber outsole.",
    images: [img(photos[i % photos.length]), img(photos[(i + 3) % photos.length]), img(photos[(i + 7) % photos.length])],
    sizes: stockArr([3, 5, 8, 6, 4, 0, 7, 5]),
    colors, rating: 3.8 + ((i * 13) % 12) / 10, reviewCount: 12 + (i * 7) % 240,
    tags: [category.toLowerCase(), brand.toLowerCase()],
  })));

  await Order.create({
    user: c1._id,
    items: [{ product: created[0]._id, name: created[0].name, brand: created[0].brand, image: created[0].images[0], size: 9, color: "Black", quantity: 1, price: created[0].price }],
    shippingAddress: { name: c1.name, line1: "123 Bonifacio Ave", city: "Taguig", province: "Metro Manila", postalCode: "1630", country: "Philippines", phone: c1.phone },
    deliveryMethod: "standard", paymentStatus: "paid", fulfillmentStatus: "delivered",
    subtotal: created[0].price, shipping: 0, tax: Math.round(created[0].price * 0.12), total: created[0].price + Math.round(created[0].price * 0.12),
  });
  await Order.create({
    user: c2._id,
    items: [{ product: created[5]._id, name: created[5].name, brand: created[5].brand, image: created[5].images[0], size: 7, color: "White", quantity: 2, price: created[5].price }],
    shippingAddress: { name: c2.name, line1: "456 Quezon Blvd", city: "Quezon City", province: "Metro Manila", postalCode: "1100", country: "Philippines", phone: c2.phone },
    deliveryMethod: "express", paymentStatus: "paid", fulfillmentStatus: "shipped",
    subtotal: created[5].price * 2, shipping: 350, tax: Math.round(created[5].price * 2 * 0.12), total: created[5].price * 2 + 350 + Math.round(created[5].price * 2 * 0.12),
    trackingNumber: "LBC987654321", carrier: "LBC Express",
  });

  console.log(`✅ Seed complete: 1 admin, 2 customers, ${created.length} products, 2 orders`);
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });

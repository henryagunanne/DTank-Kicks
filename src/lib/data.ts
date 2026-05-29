import type { Product, Review } from "./types";

// Unsplash shoe images (royalty-free hot-link friendly via images.unsplash.com)
const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const SIZES = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const stockArr = (pattern: number[]) =>
  SIZES.map((s, i) => ({ size: s, stock: pattern[i % pattern.length] }));

// A simple color palette to assign to products based on their category and brand.
const C = {
  black: { name: "Black", hex: "#111111" },
  white: { name: "White", hex: "#f5f5f5" },
  gray: { name: "Gray", hex: "#9ca3af" },
  red: { name: "Red", hex: "#dc2626" },
  blue: { name: "Blue", hex: "#1e40af" },
  green: { name: "Green", hex: "#15803d" },
  tan: { name: "Tan", hex: "#b08968" },
  brown: { name: "Brown", hex: "#6b3a18" },
  gold: { name: "Gold", hex: "#d4af37" },
};

// In a real app, this data would come from a database and be accessed via API calls,
// but for simplicity we're hardcoding it here. The `fetchProducts` function in `api.ts` simulates fetching this data with filtering, sorting and pagination.
const photos = [
  "photo-1542291026-7eec264c27ff", // red nike
  "photo-1606107557195-0e29a4b5b4aa", // white sneaker
  "photo-1595950653106-6c9ebd614d3a", // boot
  "photo-1533681904393-9ab6eee7e408", // formal
  "photo-1539185441755-769473a23570", // sport
  "photo-1603487742131-4160ec999306", // sandal
  "photo-1600185365926-3a2ce3cdb9eb", // sneaker
  "photo-1551107696-a4b0c5a0d9a2", // boot
  "photo-1560769629-975ec94e6a86", // black sneaker
  "photo-1491553895911-0055eca6402d", // converse
  "photo-1620799140408-edc6dcb6d633", // vans
  "photo-1551116322-f8e8a96f9569", // formal shoe
  "photo-1463100099107-aa0980c362e6", // boots
  "photo-1597248881519-db089d3744a5", // running
  "photo-1542219550-37153d387c27", // sandal
  "photo-1525966222134-fcfa99b8ae77", // adidas
  "photo-1608231387042-66d1773070a5", // puma
  "photo-1606107557195-0e29a4b5b4aa",
  "photo-1594035795866-3cb09a3d568f",
  "photo-1572635196237-14b3f281503f",
  "photo-1520256862855-398228c41684",
  "photo-1556906781-9a412961c28c",
  "photo-1582588678413-dbf45f4823e9",
  "photo-1512374382149-233c42b6a83b",
];


// A helper function to generate consistent product data based on an index, category and brand.
// This allows us to create a diverse catalog of products with different attributes without having to manually specify each one.
const make = (
  i: number,
  brand: Product["brand"],
  category: Product["category"],
  name: string,
  price: number,
  colors: { name: string; hex: string }[],
  opts: Partial<Product> = {},
): Product => ({
  id: `p-${i + 1}`,
  name,
  brand,
  category,
  description:
    "Premium engineered upper with breathable mesh, cushioned midsole, and a durable rubber outsole. Built for everyday comfort and street-ready style.",
  price,
  compareAtPrice: i % 4 === 0 ? Math.round(price * 1.25) : undefined,
  images: [img(photos[i % photos.length]), img(photos[(i + 3) % photos.length]), img(photos[(i + 7) % photos.length]), img(photos[(i + 11) % photos.length])],
  sizes: stockArr([3, 5, 8, 6, 4, 0, 7, 5]),
  colors,
  rating: 3.8 + ((i * 13) % 12) / 10,
  reviewCount: 12 + (i * 7) % 240,
  tags: [category.toLowerCase(), brand.toLowerCase()],
  isNew: i < 8,
  ...opts,
});


// Static product data to power the demo 
// in a real app this would come from a database and be accessed via API calls, 
// but for simplicity we're hardcoding it here. 
// The `fetchProducts` function in `api.ts` simulates fetching this data with filtering, 
// sorting and pagination.
export const PRODUCTS: Product[] = [
  make(0, "Nike", "Sneakers", "Air Pulse 270", 7995, [C.black, C.white, C.red]),
  make(1, "Adidas", "Sneakers", "Ultraboost Drift", 9450, [C.white, C.black, C.blue]),
  make(2, "Puma", "Sports", "Velocity Nitro 3", 6750, [C.blue, C.black]),
  make(3, "New Balance", "Sneakers", "990v6 Heritage", 12500, [C.gray, C.black]),
  make(4, "Vans", "Sneakers", "Old Skool Classic", 4250, [C.black, C.white]),
  make(5, "Converse", "Sneakers", "Chuck 70 Hi", 4895, [C.white, C.black, C.red]),
  make(6, "Nike", "Sports", "ZoomX Streakfly", 8950, [C.gold, C.black]),
  make(7, "Adidas", "Sports", "Adizero Boston 12", 7995, [C.white, C.blue]),
  make(8, "Puma", "Sneakers", "Suede Classic XXI", 4995, [C.red, C.black, C.white]),
  make(9, "New Balance", "Sports", "Fresh Foam 1080", 9250, [C.black, C.gray]),
  make(10, "Vans", "Sneakers", "Sk8-Hi Reissue", 4850, [C.black, C.white]),
  make(11, "Converse", "Sneakers", "Run Star Motion", 6450, [C.white, C.black]),
  make(12, "Nike", "Boots", "ACG Goretex Trail", 11250, [C.brown, C.black]),
  make(13, "Adidas", "Boots", "Terrex Free Hiker", 13500, [C.black, C.tan]),
  make(14, "Puma", "Formal", "Tazon Leather Oxford", 5950, [C.black, C.brown]),
  make(15, "New Balance", "Formal", "Numeric Derby", 6750, [C.brown, C.black]),
  make(16, "Vans", "Sandals", "Hi-Standard Sandal", 2950, [C.black, C.tan]),
  make(17, "Converse", "Sandals", "Run Star Slide", 3450, [C.white, C.black]),
  make(18, "Nike", "Sandals", "Calm Slide", 2750, [C.black, C.gray]),
  make(19, "Adidas", "Sandals", "Adilette Comfort", 2450, [C.black, C.white]),
  make(20, "Puma", "Boots", "Tactical Mid", 8450, [C.black, C.brown]),
  make(21, "Nike", "Formal", "Killshot Premium", 7250, [C.white, C.green]),
  make(22, "Adidas", "Formal", "Stan Smith Lux", 6950, [C.white, C.gold]),
  make(23, "New Balance", "Boots", "Rainier Trail Boot", 10950, [C.brown, C.tan]),
];



export const CATEGORIES = [
  { name: "Sneakers", img: img("photo-1542291026-7eec264c27ff") },
  { name: "Boots", img: img("photo-1605733513597-a8f8341084e6") },
  { name: "Formal", img: img("photo-1533681904393-9ab6eee7e408") },
  { name: "Sports", img: img("photo-1539185441755-769473a23570") },
  { name: "Sandals", img: img("photo-1603487742131-4160ec999306") },
] as const;

export const BRANDS = ["Nike", "Adidas", "Puma", "New Balance", "Vans", "Converse"] as const;


// Generate some fake reviews for the products. In a real app, these would be stored in the database and fetched via API.
export const REVIEWS: Review[] = PRODUCTS.flatMap((p, idx) =>
  Array.from({ length: 3 }).map((_, i) => ({
    id: `${p.id}-r-${i}`,
    productId: p.id,
    userName: ["Marco S.", "Jen L.", "Rico D.", "Aria M.", "Paolo R."][(idx + i) % 5],
    rating: Math.max(3, Math.round(p.rating + (i - 1))),
    title: ["Best pair I own", "Super comfortable", "Solid build", "Looks great"][i % 4],
    body:
      "Fits true to size and feels broken-in from day one. Great cushioning for long walks around the city. Definitely buying another pair.",
    verifiedPurchase: i !== 2,
    createdAt: new Date(Date.now() - (idx * 86400000 + i * 3600000)).toISOString(),
  })),
);

// A helper function to get a product by ID, used in the product details page. In a real app, you'd fetch this from the server.
export function getProduct(id: string) {
  return PRODUCTS.find((p) => p.id === id);
}

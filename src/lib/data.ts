// Unsplash shoe images (royalty-free hot-link friendly via images.unsplash.com)
const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;


export const CATEGORIES = [
  { name: "Sneakers", img: img("photo-1542291026-7eec264c27ff") },
  { name: "Boots", img: img("photo-1605733513597-a8f8341084e6") },
  { name: "Formal", img: img("photo-1533681904393-9ab6eee7e408") },
  { name: "Sports", img: img("photo-1539185441755-769473a23570") },
  { name: "Sandals", img: img("photo-1603487742131-4160ec999306") },
] as const;

export const BRANDS = ["Nike", "Adidas", "Puma", "New Balance", "Vans", "Converse"] as const;

// This file defines the TypeScript types used throughout the application, 
// such as Product, CartItem, and Review. These types are imported and used 
// in various components and API functions to ensure type safety and consistency 
// when working with product data, cart items, and reviews.


export type Category = "Sneakers" | "Boots" | "Formal" | "Sports" | "Sandals";
export type Brand = "Nike" | "Adidas" | "Puma" | "New Balance" | "Vans" | "Converse";

export interface SizeStock { size: number; stock: number; }
export interface Color { name: string; hex: string; }
export interface Variant {
  id: string;
  size: number;
  color: Color;
  price: number;
  compareAtPrice?: number;
  stock: number;
}


export interface Product {
  id: string;
  name: string;
  brand: Brand;
  category: Category;
  description: string;
  images: string[];
  variants: Variant[];
  sizes: SizeStock[];
  colors: Color[];
  minPrice: number;
  maxPrice: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  isNew?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  brand: string;
  image: string;
  quantity: number;
  priceAtAdd: number;
  size: number;
  color: string;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  images?: string[];
  verifiedPurchase: boolean;
  createdAt: string;
}


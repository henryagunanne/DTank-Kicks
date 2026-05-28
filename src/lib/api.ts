const API = ''  // empty string because Vite proxy handles the /api prefix

export async function fetchProducts(params?: {
  category?: string
  brand?: string
  page?: number
  limit?: number
  sort?: string
}) {
  const query = new URLSearchParams()
  if (params?.category) query.set('category', params.category)
  if (params?.brand) query.set('brand', params.brand)
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.sort) query.set('sort', params.sort)

  const res = await fetch(`${API}/api/products?${query}`)
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()  // returns { items, total, page, pages }
}

export async function fetchProductById(id: string) {
  const res = await fetch(`${API}/api/products/${id}`)
  if (!res.ok) throw new Error('Product not found')
  return res.json()
}
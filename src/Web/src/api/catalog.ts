import { api } from './http'
import type { CategoryDto, PagedResult, ProductDto } from './types'

export interface ProductListParams {
  categoryId?: string
  page?: number
  pageSize?: number
}

function query(params: object): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

export const catalogApi = {
  products: (params: ProductListParams = {}) =>
    api<PagedResult<ProductDto>>(`/api/products${query(params)}`),
  product: (id: string) => api<ProductDto>(`/api/products/${id}`),
  categories: () => api<CategoryDto[]>('/api/categories'),
  category: (id: string) => api<CategoryDto>(`/api/categories/${id}`),

  // Admin
  createProduct: (req: { name: string; description: string; price: number; categoryId: string }) =>
    api<ProductDto>('/api/products', { method: 'POST', body: req }),
  updateProduct: (id: string, req: { name: string; description: string; categoryId: string }) =>
    api<ProductDto>(`/api/products/${id}`, { method: 'PUT', body: req }),
  changePrice: (id: string, newPrice: number) =>
    api<ProductDto>(`/api/products/${id}/price`, { method: 'PATCH', body: { newPrice } }),
  deleteProduct: (id: string) => api<void>(`/api/products/${id}`, { method: 'DELETE' }),
  uploadProductImage: (id: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api<ProductDto>(`/api/products/${id}/image`, { method: 'POST', body: fd })
  },
  createCategory: (req: { name: string; description?: string }) =>
    api<CategoryDto>('/api/categories', { method: 'POST', body: req }),
  updateCategory: (id: string, req: { name: string; description?: string }) =>
    api<CategoryDto>(`/api/categories/${id}`, { method: 'PUT', body: req }),
}

export { query as buildQuery }

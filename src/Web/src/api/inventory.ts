import { api } from './http'
import type { StockItemDto } from './types'

export const inventoryApi = {
  // Seed edilmemiş ürün için 404 fırlatır — çağıran taraf "stok bilinmiyor" olarak ele alır.
  stock: (productId: string) => api<StockItemDto>(`/api/inventory/${productId}`),
  // Admin
  setQuantity: (productId: string, quantity: number) =>
    api<StockItemDto>(`/api/inventory/${productId}`, { method: 'PUT', body: { quantity } }),
}

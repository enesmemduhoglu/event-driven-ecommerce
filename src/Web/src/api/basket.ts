import { api } from './http'
import type { BasketItem, CustomerBasket } from './types'

export const basketApi = {
  get: () => api<CustomerBasket>('/api/basket'),
  // Sepet, ürünün ad/fiyat anlık görüntüsünü client'tan alır (backend sözleşmesi).
  addItem: (item: BasketItem) =>
    api<CustomerBasket>('/api/basket/items', { method: 'POST', body: item }),
  updateQuantity: (productId: string, quantity: number) =>
    api<CustomerBasket>(`/api/basket/items/${productId}`, { method: 'PUT', body: { quantity } }),
  removeItem: (productId: string) =>
    api<CustomerBasket>(`/api/basket/items/${productId}`, { method: 'DELETE' }),
  clear: () => api<void>('/api/basket', { method: 'DELETE' }),
}

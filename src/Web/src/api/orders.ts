import { api } from './http'
import type { CreateOrderRequest, OrderDto } from './types'

export const ordersApi = {
  // 202 Accepted döner: sipariş Pending başlar, saga asenkron sonuçlandırır.
  create: (req: CreateOrderRequest) => api<OrderDto>('/api/orders', { method: 'POST', body: req }),
  list: () => api<OrderDto[]>('/api/orders'),
  get: (id: string) => api<OrderDto>(`/api/orders/${id}`),
}

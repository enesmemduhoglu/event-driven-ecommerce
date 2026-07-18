import { api } from './http'
import { buildQuery } from './catalog'
import type { CreateOrderRequest, OrderDto, OrderStatus, PagedResult } from './types'

export interface AdminOrderListParams {
  status?: OrderStatus
  page?: number
  pageSize?: number
}

export const ordersApi = {
  // 202 Accepted döner: sipariş Pending başlar, saga asenkron sonuçlandırır.
  create: (req: CreateOrderRequest) => api<OrderDto>('/api/orders', { method: 'POST', body: req }),
  list: () => api<OrderDto[]>('/api/orders'),
  get: (id: string) => api<OrderDto>(`/api/orders/${id}`),

  // Admin
  listAll: (params: AdminOrderListParams = {}) =>
    api<PagedResult<OrderDto>>(`/api/orders/all${buildQuery(params)}`),
  ship: (id: string) => api<OrderDto>(`/api/orders/${id}/ship`, { method: 'POST' }),
  deliver: (id: string) => api<OrderDto>(`/api/orders/${id}/deliver`, { method: 'POST' }),
}

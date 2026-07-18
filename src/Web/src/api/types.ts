// Backend DTO'larının birebir TypeScript karşılıkları (camelCase JSON).

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAtUtc: string
}

export interface UserInfo {
  id: string
  email: string
  fullName: string
  roles: string[]
}

export interface CategoryDto {
  id: string
  name: string
  description: string | null
}

export interface ProductDto {
  id: string
  name: string
  description: string
  price: number
  categoryId: string
  categoryName: string
  imageUrl: string | null
  createdAtUtc: string
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface BasketItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
}

export interface CustomerBasket {
  userId: string
  items: BasketItem[]
  totalAmount: number
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Shipped' | 'Delivered'

export interface OrderItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
}

export interface OrderDto {
  id: string
  userId: string
  userEmail: string
  status: OrderStatus
  totalAmount: number
  shippingAddress: string
  cancellationReason: string | null
  createdAtUtc: string
  items: OrderItem[]
}

export interface CreateOrderRequest {
  items: OrderItem[]
  shippingAddress: string
  cardNumber: string
}

export interface StockItemDto {
  productId: string
  productName: string
  availableQuantity: number
}

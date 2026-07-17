import { api } from './http'
import { buildQuery } from './catalog'
import type { PagedResult, ProductDto } from './types'

export interface SearchParams {
  q?: string
  categoryId?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'price_asc' | 'price_desc'
  page?: number
  pageSize?: number
}

// ProductDocument alanları ProductDto ile birebir aynı.
export const searchApi = {
  search: (params: SearchParams) => api<PagedResult<ProductDto>>(`/api/search${buildQuery(params)}`),
}

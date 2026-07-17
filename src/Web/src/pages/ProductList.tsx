import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { catalogApi } from '@/api/catalog'
import { Pagination } from '@/components/Pagination'
import { ProductCard } from '@/components/ProductCard'
import { Spinner } from '@/components/Spinner'

const PAGE_SIZE = 12

export function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = searchParams.get('categoryId') ?? undefined
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const products = useQuery({
    queryKey: ['products', { categoryId, page, pageSize: PAGE_SIZE }],
    queryFn: () => catalogApi.products({ categoryId, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  function update(next: { categoryId?: string; page?: number }) {
    const params = new URLSearchParams()
    const cat = 'categoryId' in next ? next.categoryId : categoryId
    const p = next.page ?? 1
    if (cat) params.set('categoryId', cat)
    if (p > 1) params.set('page', String(p))
    setSearchParams(params)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Ürünler</h1>
        <select
          value={categoryId ?? ''}
          onChange={(e) => update({ categoryId: e.target.value || undefined })}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Tüm kategoriler</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {products.isPending ? (
        <Spinner fullPage />
      ) : products.isError ? (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Ürünler yüklenemedi: {products.error.message}
        </p>
      ) : products.data.items.length === 0 ? (
        <p className="py-12 text-center text-gray-500">Bu kriterlere uyan ürün bulunamadı.</p>
      ) : (
        <>
          <div
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${
              products.isPlaceholderData ? 'opacity-60' : ''
            }`}
          >
            {products.data.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <Pagination
            page={products.data.page}
            totalPages={products.data.totalPages}
            onPageChange={(p) => update({ page: p })}
          />
        </>
      )}
    </div>
  )
}

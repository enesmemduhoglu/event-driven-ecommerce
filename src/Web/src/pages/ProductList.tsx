import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { catalogApi } from '@/api/catalog'
import { ErrorState } from '@/components/Feedback'
import { Pagination } from '@/components/Pagination'
import { ProductCard } from '@/components/ProductCard'
import { ProductGridSkeleton } from '@/components/Skeleton'
import { card } from '@/components/ui'

const PAGE_SIZE = 12

const categoryLink = (active: boolean) =>
  active
    ? 'font-bold text-link-hover'
    : 'text-gray-700 transition-colors duration-150 hover:text-link-hover'

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

  const activeCategory = categories.data?.find((c) => c.id === categoryId)

  function goToPage(p: number) {
    const params = new URLSearchParams()
    if (categoryId) params.set('categoryId', categoryId)
    if (p > 1) params.set('page', String(p))
    setSearchParams(params)
  }

  return (
    <div className="flex gap-4">
      {/* Sol filtre çubuğu */}
      <aside className={`${card} hidden w-56 shrink-0 self-start p-4 md:block`}>
        <h2 className="mb-2 font-bold">Kategoriler</h2>
        <ul className="space-y-1 text-sm">
          <li>
            <Link
              to="/products"
              aria-current={!categoryId ? 'true' : undefined}
              className={categoryLink(!categoryId)}
            >
              Tüm Ürünler
            </Link>
          </li>
          {categories.data?.map((c) => (
            <li key={c.id}>
              <Link
                to={`/products?categoryId=${c.id}`}
                aria-current={c.id === categoryId ? 'true' : undefined}
                className={categoryLink(c.id === categoryId)}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0 flex-1">
        <div className={`${card} mb-4 flex items-center justify-between px-4 py-2 text-sm`}>
          <span>
            {products.data ? (
              <>
                <span className="font-semibold">{products.data.totalCount}</span> sonuç
                {activeCategory && (
                  <>
                    {' — '}
                    <span className="font-semibold text-link-hover">{activeCategory.name}</span>
                  </>
                )}
              </>
            ) : (
              'Yükleniyor…'
            )}
          </span>
          {/* Mobilde kategori seçimi */}
          <select
            value={categoryId ?? ''}
            aria-label="Kategori seç"
            onChange={(e) => {
              const params = new URLSearchParams()
              if (e.target.value) params.set('categoryId', e.target.value)
              setSearchParams(params)
            }}
            className="rounded-md border border-gray-300 bg-white px-2 py-1.5 md:hidden"
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
          <ProductGridSkeleton />
        ) : products.isError ? (
          <ErrorState
            message={`Ürünler yüklenemedi: ${products.error.message}`}
            onRetry={() => products.refetch()}
          />
        ) : products.data.items.length === 0 ? (
          <div className={`${card} px-6 py-12 text-center text-gray-500`}>
            <p>Bu kriterlere uyan ürün bulunamadı.</p>
            <Link to="/products" className="mt-2 inline-block text-sm text-link hover:underline">
              Tüm ürünlere göz atın
            </Link>
          </div>
        ) : (
          <>
            <div
              className={`grid grid-cols-2 gap-3 transition-opacity duration-150 sm:grid-cols-3 xl:grid-cols-4 ${
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
              onPageChange={goToPage}
            />
          </>
        )}
      </div>
    </div>
  )
}

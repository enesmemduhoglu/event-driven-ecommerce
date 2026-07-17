import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import type { FormEvent } from 'react'
import { catalogApi } from '@/api/catalog'
import { searchApi } from '@/api/search'
import type { SearchParams } from '@/api/search'
import { ServiceUnavailableError } from '@/api/http'
import { Pagination } from '@/components/Pagination'
import { ProductCard } from '@/components/ProductCard'
import { Spinner } from '@/components/Spinner'

import { btnOrange, card } from '@/components/ui'

const PAGE_SIZE = 12
const inputClass =
  'rounded-md border border-gray-400 bg-white px-3 py-2 text-sm shadow-inner focus:border-[#e77600] focus:outline-none'

export function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()

  const params: SearchParams = {
    q: searchParams.get('q') ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    sort: (searchParams.get('sort') as SearchParams['sort']) ?? undefined,
    page: Math.max(1, Number(searchParams.get('page')) || 1),
    pageSize: PAGE_SIZE,
  }

  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const results = useQuery({
    queryKey: ['search', params],
    queryFn: () => searchApi.search(params),
    placeholderData: keepPreviousData,
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const next = new URLSearchParams()
    for (const key of ['q', 'categoryId', 'minPrice', 'maxPrice', 'sort'] as const) {
      const value = form.get(key)
      if (typeof value === 'string' && value !== '') next.set(key, value)
    }
    setSearchParams(next) // sayfa 1'e döner
  }

  function goToPage(page: number) {
    const next = new URLSearchParams(searchParams)
    if (page > 1) next.set('page', String(page))
    else next.delete('page')
    setSearchParams(next)
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Ürün Arama</h1>

      <form onSubmit={onSubmit} className={`${card} mb-6 flex flex-wrap items-end gap-3 p-4`}>
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-gray-600">Arama</span>
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Ürün adı, açıklama…"
            className={`${inputClass} w-full`}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-gray-600">Kategori</span>
          <select name="categoryId" defaultValue={params.categoryId ?? ''} className={inputClass}>
            <option value="">Tümü</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-gray-600">Min ₺</span>
          <input
            name="minPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={params.minPrice ?? ''}
            className={`${inputClass} w-24`}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-gray-600">Max ₺</span>
          <input
            name="maxPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={params.maxPrice ?? ''}
            className={`${inputClass} w-24`}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-gray-600">Sıralama</span>
          <select name="sort" defaultValue={params.sort ?? ''} className={inputClass}>
            <option value="">İlgililik</option>
            <option value="price_asc">Fiyat (artan)</option>
            <option value="price_desc">Fiyat (azalan)</option>
          </select>
        </label>
        <button type="submit" className={btnOrange}>
          Ara
        </button>
      </form>

      {results.isPending ? (
        <Spinner fullPage />
      ) : results.isError ? (
        results.error instanceof ServiceUnavailableError ? (
          <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Arama servisi şu anda kullanılamıyor. Ürünlere{' '}
            <a href="/products" className="font-medium underline">
              katalog sayfasından
            </a>{' '}
            göz atabilirsiniz.
          </p>
        ) : (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            Arama başarısız: {results.error.message}
          </p>
        )
      ) : results.data.items.length === 0 ? (
        <p className="py-12 text-center text-gray-500">Sonuç bulunamadı.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-500">{results.data.totalCount} sonuç bulundu</p>
          <div
            className={`grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 ${
              results.isPlaceholderData ? 'opacity-60' : ''
            }`}
          >
            {results.data.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <Pagination
            page={results.data.page}
            totalPages={results.data.totalPages}
            onPageChange={goToPage}
          />
        </>
      )}
    </div>
  )
}

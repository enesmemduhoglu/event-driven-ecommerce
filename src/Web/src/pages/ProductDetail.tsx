import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { catalogApi } from '@/api/catalog'
import { inventoryApi } from '@/api/inventory'
import { ApiError } from '@/api/http'
import { Money } from '@/components/Money'
import { Spinner } from '@/components/Spinner'

function StockInfo({ productId }: { productId: string }) {
  const stock = useQuery({
    queryKey: ['inventory', productId],
    queryFn: () => inventoryApi.stock(productId),
    retry: false,
  })

  if (stock.isPending) return <span className="text-sm text-gray-400">Stok kontrol ediliyor…</span>
  if (stock.isError) {
    // Seed edilmemiş ürün 404 döner — stok bilinmiyor.
    if (stock.error instanceof ApiError && stock.error.status === 404)
      return <span className="text-sm text-gray-400">Stok bilgisi yok</span>
    return <span className="text-sm text-gray-400">Stok bilgisi alınamadı</span>
  }
  return stock.data.availableQuantity > 0 ? (
    <span className="text-sm font-medium text-emerald-600">
      Stokta {stock.data.availableQuantity} adet
    </span>
  ) : (
    <span className="text-sm font-medium text-red-600">Stokta yok</span>
  )
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const product = useQuery({
    queryKey: ['product', id],
    queryFn: () => catalogApi.product(id!),
    enabled: !!id,
  })

  if (product.isPending) return <Spinner fullPage />
  if (product.isError)
    return (
      <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
        Ürün yüklenemedi: {product.error.message}
      </p>
    )

  const p = product.data
  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 text-sm text-gray-500">
        <Link to="/products" className="hover:text-indigo-600">
          Ürünler
        </Link>
        {' / '}
        <Link to={`/products?categoryId=${p.categoryId}`} className="hover:text-indigo-600">
          {p.categoryName}
        </Link>
      </nav>

      <div className="rounded-xl border border-gray-200 bg-white p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{p.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{p.categoryName}</p>
          </div>
          <Money amount={p.price} className="text-2xl font-bold text-indigo-700" />
        </div>

        <p className="mt-4 whitespace-pre-line text-gray-700">{p.description}</p>

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <StockInfo productId={p.id} />
          {/* Phase 11.3: Sepete Ekle butonu */}
        </div>
      </div>
    </div>
  )
}

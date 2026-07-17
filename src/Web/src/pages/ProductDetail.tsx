import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { catalogApi } from '@/api/catalog'
import { inventoryApi } from '@/api/inventory'
import { basketApi } from '@/api/basket'
import { ApiError } from '@/api/http'
import { useAuth } from '@/auth/AuthContext'
import { Money } from '@/components/Money'
import { Spinner } from '@/components/Spinner'
import { useToast } from '@/components/Toaster'
import type { ProductDto } from '@/api/types'

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

function AddToBasket({ product }: { product: ProductDto }) {
  const { status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [quantity, setQuantity] = useState(1)

  const addItem = useMutation({
    mutationFn: () =>
      basketApi.addItem({
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity,
      }),
    onSuccess: (basket) => {
      queryClient.setQueryData(['basket'], basket)
      toast(`${product.name} sepete eklendi`, 'success')
    },
    onError: (err) => toast(err.message, 'error'),
  })

  function onClick() {
    if (status !== 'authenticated') {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    addItem.mutate()
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
        aria-label="Adet"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n} adet
          </option>
        ))}
      </select>
      <button
        onClick={onClick}
        disabled={addItem.isPending}
        className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {addItem.isPending ? 'Ekleniyor…' : 'Sepete Ekle'}
      </button>
    </div>
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
          <AddToBasket product={p} />
        </div>
      </div>
    </div>
  )
}

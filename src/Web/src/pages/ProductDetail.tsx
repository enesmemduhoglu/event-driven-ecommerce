import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { catalogApi } from '@/api/catalog'
import { inventoryApi } from '@/api/inventory'
import { basketApi } from '@/api/basket'
import { ApiError } from '@/api/http'
import { useAuth } from '@/auth/AuthContext'
import { ErrorState } from '@/components/Feedback'
import { ChevronRightIcon } from '@/components/icons'
import { Money } from '@/components/Money'
import { ProductImage } from '@/components/ProductImage'
import { Spinner } from '@/components/Spinner'
import { Stars, pseudoRating } from '@/components/Stars'
import { useToast } from '@/components/Toaster'
import { btnPrimary, card, linkBlue } from '@/components/ui'
import type { ProductDto } from '@/api/types'

function useStock(productId: string) {
  return useQuery({
    queryKey: ['inventory', productId],
    queryFn: () => inventoryApi.stock(productId),
    retry: false,
  })
}

function StockLine({ productId }: { productId: string }) {
  const stock = useStock(productId)

  if (stock.isPending) return <p className="text-sm text-gray-400">Stok kontrol ediliyor…</p>
  if (stock.isError) {
    // Seed edilmemiş ürün 404 döner — stok bilinmiyor.
    const notFound = stock.error instanceof ApiError && stock.error.status === 404
    return (
      <p className="text-sm text-gray-400">{notFound ? 'Stok bilgisi yok' : 'Stok bilgisi alınamadı'}</p>
    )
  }
  return stock.data.availableQuantity > 0 ? (
    <p className="text-lg font-semibold text-good">Stokta var</p>
  ) : (
    <p className="text-lg font-semibold text-price">Stokta yok</p>
  )
}

function BuyBox({ product }: { product: ProductDto }) {
  const { status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [quantity, setQuantity] = useState(1)
  const stock = useStock(product.id)

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

  const outOfStock = stock.data ? stock.data.availableQuantity <= 0 : false

  return (
    <div className={`${card} h-fit w-full shrink-0 p-4 lg:w-64`}>
      <Money amount={product.price} className="text-2xl font-semibold text-price" />
      <p className="mt-1 text-xs text-gray-500">Kargo bedava — demo mağaza</p>
      <div className="mt-3">
        <StockLine productId={product.id} />
      </div>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-gray-600">Adet</span>
        <select
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 bg-[#f0f2f2] px-2 py-2 shadow-sm transition-colors duration-150 focus:border-focus focus:ring-2 focus:ring-focus/30 focus:outline-none"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button
        onClick={onClick}
        disabled={addItem.isPending || outOfStock}
        className={`${btnPrimary} mt-4 w-full`}
      >
        {addItem.isPending ? 'Ekleniyor…' : 'Sepete Ekle'}
      </button>
      <p className="mt-3 text-xs text-gray-500">
        Satıcı: <span className={linkBlue}>e-ticaret.dev</span>
      </p>
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
      <ErrorState
        message={`Ürün yüklenemedi: ${product.error.message}`}
        onRetry={() => product.refetch()}
      />
    )

  const p = product.data
  const { rating } = pseudoRating(p.id)

  return (
    <div>
      <nav aria-label="İçerik haritası" className="mb-3 flex items-center gap-1 text-sm text-gray-500">
        <Link to="/products" className={linkBlue}>
          Ürünler
        </Link>
        <ChevronRightIcon size={14} className="shrink-0 text-gray-400" />
        <Link to={`/products?categoryId=${p.categoryId}`} className={linkBlue}>
          {p.categoryName}
        </Link>
        <ChevronRightIcon size={14} className="shrink-0 text-gray-400" />
        <span className="truncate">{p.name}</span>
      </nav>

      <div className={`${card} flex flex-col gap-6 p-6 lg:flex-row`}>
        <ProductImage
          productId={p.id}
          name={p.name}
          categoryName={p.categoryName}
          imageUrl={p.imageUrl}
          className="aspect-square w-full max-w-md self-center rounded-lg lg:self-start"
          iconClassName="size-32"
        />

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{p.name}</h1>
          <p className={`mt-0.5 text-sm ${linkBlue}`}>{p.categoryName}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-link-hover">{rating.toFixed(1)}</span>
            <Stars id={p.id} />
          </div>
          <hr className="my-4 border-gray-200" />
          <Money amount={p.price} className="text-xl font-semibold text-price" />
          <h2 className="mt-4 font-bold">Ürün Açıklaması</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{p.description}</p>
          <p className="mt-4 text-xs text-gray-400">
            Eklenme: {new Date(p.createdAtUtc).toLocaleDateString('tr-TR')}
          </p>
        </div>

        <BuyBox product={p} />
      </div>
    </div>
  )
}

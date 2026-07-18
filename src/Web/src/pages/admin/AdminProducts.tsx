import { useState } from 'react'
import type { FormEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { catalogApi } from '@/api/catalog'
import { inventoryApi } from '@/api/inventory'
import { ApiError } from '@/api/http'
import type { ProductDto } from '@/api/types'
import { ErrorState } from '@/components/Feedback'
import { CheckIcon, PencilIcon, PlusIcon, XIcon } from '@/components/icons'
import { formatMoney } from '@/components/Money'
import { Pagination } from '@/components/Pagination'
import { ProductImage } from '@/components/ProductImage'
import { Spinner } from '@/components/Spinner'
import { useToast } from '@/components/Toaster'
import { btnPrimary, btnSecondary, card, input as inputClass, linkBlue } from '@/components/ui'

const PAGE_SIZE = 10

function StockCell({ productId }: { productId: string }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  const stock = useQuery({
    queryKey: ['inventory', productId],
    queryFn: () => inventoryApi.stock(productId),
    retry: false,
  })

  const setQuantity = useMutation({
    mutationFn: (quantity: number) => inventoryApi.setQuantity(productId, quantity),
    onSuccess: (data) => {
      queryClient.setQueryData(['inventory', productId], data)
      setEditing(false)
      toast('Stok güncellendi', 'success')
    },
    onError: (err) => toast(err.message, 'error'),
  })

  if (stock.isPending) return <span className="text-xs text-gray-400">…</span>
  if (stock.isError) {
    const notFound = stock.error instanceof ApiError && stock.error.status === 404
    return <span className="text-xs text-gray-400">{notFound ? '—' : 'hata'}</span>
  }

  if (editing)
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const q = Number(value)
          if (Number.isInteger(q) && q >= 0) setQuantity.mutate(q)
        }}
        className="flex items-center gap-1"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="number"
          min="0"
          aria-label="Stok adedi"
          className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-focus focus:ring-2 focus:ring-focus/30 focus:outline-none"
          autoFocus
        />
        <button
          type="submit"
          disabled={setQuantity.isPending}
          aria-label="Stok değişikliğini kaydet"
          className="rounded-md p-1.5 text-good transition-colors duration-150 hover:bg-green-50"
        >
          <CheckIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label="Stok düzenlemeyi iptal et"
          className="rounded-md p-1.5 text-gray-400 transition-colors duration-150 hover:bg-gray-100"
        >
          <XIcon size={16} />
        </button>
      </form>
    )

  return (
    <button
      onClick={() => {
        setValue(String(stock.data.availableQuantity))
        setEditing(true)
      }}
      className={`inline-flex items-center gap-1 text-sm ${stock.data.availableQuantity > 0 ? 'text-gray-900' : 'text-price'} hover:underline`}
      title="Stok düzenle"
    >
      {stock.data.availableQuantity}
      <PencilIcon size={13} className="text-gray-400" />
    </button>
  )
}

function PriceModal({ product, onClose }: { product: ProductDto; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [price, setPrice] = useState(String(product.price))

  const changePrice = useMutation({
    mutationFn: (newPrice: number) => catalogApi.changePrice(product.id, newPrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', product.id] })
      toast('Fiyat güncellendi', 'success')
      onClose()
    },
    onError: (err) => toast(err.message, 'error'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const p = Number(price)
    if (p >= 0.01) changePrice.mutate(p)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-label="Fiyat değiştir"
        className={`${card} w-full max-w-sm p-6`}
      >
        <h2 className="font-bold">Fiyat Değiştir</h2>
        <p className="mt-1 text-sm text-gray-600">
          {product.name} — mevcut: {formatMoney(product.price)}
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Yeni fiyat (₺)</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
            autoFocus
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Vazgeç
          </button>
          <button type="submit" disabled={changePrice.isPending} className={btnPrimary}>
            {changePrice.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}

function DeleteButton({ product }: { product: ProductDto }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [confirming, setConfirming] = useState(false)

  const del = useMutation({
    mutationFn: () => catalogApi.deleteProduct(product.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast(`${product.name} silindi`, 'info')
    },
    onError: (err) => toast(err.message, 'error'),
  })

  if (confirming)
    return (
      <span className="flex items-center gap-1 text-sm">
        <span className="text-gray-600">Emin misiniz?</span>
        <button onClick={() => del.mutate()} disabled={del.isPending} className="text-price hover:underline">
          Evet
        </button>
        /
        <button onClick={() => setConfirming(false)} className={linkBlue}>
          Hayır
        </button>
      </span>
    )

  return (
    <button onClick={() => setConfirming(true)} className="text-sm text-price hover:underline">
      Sil
    </button>
  )
}

export function AdminProducts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const [priceModalFor, setPriceModalFor] = useState<ProductDto | null>(null)

  const products = useQuery({
    queryKey: ['products', { page, pageSize: PAGE_SIZE }],
    queryFn: () => catalogApi.products({ page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  return (
    <div className={`${card} p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Ürünler</h1>
        <Link to="/admin/products/new" className={btnPrimary}>
          <PlusIcon size={16} />
          Yeni Ürün
        </Link>
      </div>

      {products.isPending ? (
        <Spinner fullPage />
      ) : products.isError ? (
        <ErrorState
          message={`Ürünler yüklenemedi: ${products.error.message}`}
          onRetry={() => products.refetch()}
        />
      ) : products.data.items.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          Henüz ürün yok.{' '}
          <Link to="/admin/products/new" className={linkBlue}>
            İlk ürünü ekleyin
          </Link>
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                  <th className="py-2 pr-3">Ürün</th>
                  <th className="py-2 pr-3">Kategori</th>
                  <th className="py-2 pr-3">Fiyat</th>
                  <th className="py-2 pr-3">Stok</th>
                  <th className="py-2">İşlemler</th>
                </tr>
              </thead>
              <tbody className={products.isPlaceholderData ? 'opacity-60' : ''}>
                {products.data.items.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <ProductImage
                          productId={p.id}
                          name={p.name}
                          categoryName={p.categoryName}
                          imageUrl={p.imageUrl}
                          className="size-10 rounded-md"
                          iconClassName="size-5"
                        />
                        <Link
                          to={`/products/${p.id}`}
                          className="font-medium transition-colors duration-150 hover:text-link-hover"
                        >
                          {p.name}
                        </Link>
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{p.categoryName}</td>
                    <td className="py-2 pr-3 font-medium">{formatMoney(p.price)}</td>
                    <td className="py-2 pr-3">
                      <StockCell productId={p.id} />
                    </td>
                    <td className="py-2">
                      <span className="flex items-center gap-3">
                        <Link to={`/admin/products/${p.id}/edit`} className={`text-sm ${linkBlue}`}>
                          Düzenle
                        </Link>
                        <button
                          onClick={() => setPriceModalFor(p)}
                          className={`text-sm ${linkBlue}`}
                        >
                          Fiyat
                        </button>
                        <DeleteButton product={p} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={products.data.page}
            totalPages={products.data.totalPages}
            onPageChange={(p) => {
              const params = new URLSearchParams()
              if (p > 1) params.set('page', String(p))
              setSearchParams(params)
            }}
          />
        </>
      )}

      {priceModalFor && (
        <PriceModal product={priceModalFor} onClose={() => setPriceModalFor(null)} />
      )}
    </div>
  )
}

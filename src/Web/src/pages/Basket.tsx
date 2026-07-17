import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { basketApi } from '@/api/basket'
import type { CustomerBasket } from '@/api/types'
import { Money } from '@/components/Money'
import { Spinner } from '@/components/Spinner'
import { useToast } from '@/components/Toaster'

export function Basket() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const basket = useQuery({ queryKey: ['basket'], queryFn: basketApi.get })

  const setBasket = (data: CustomerBasket) => queryClient.setQueryData(['basket'], data)

  const updateQuantity = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      basketApi.updateQuantity(productId, quantity),
    onSuccess: setBasket,
    onError: (err) => toast(err.message, 'error'),
  })
  const removeItem = useMutation({
    mutationFn: (productId: string) => basketApi.removeItem(productId),
    onSuccess: setBasket,
    onError: (err) => toast(err.message, 'error'),
  })
  const clear = useMutation({
    mutationFn: basketApi.clear,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['basket'] }),
    onError: (err) => toast(err.message, 'error'),
  })

  if (basket.isPending) return <Spinner fullPage />
  if (basket.isError)
    return (
      <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
        Sepet yüklenemedi: {basket.error.message}
      </p>
    )

  const b = basket.data
  if (b.items.length === 0)
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Sepetiniz boş</h1>
        <p className="mt-2 text-gray-500">Ürünlere göz atıp sepetinize ekleyin.</p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Ürünlere Göz At
        </Link>
      </div>
    )

  const busy = updateQuantity.isPending || removeItem.isPending || clear.isPending

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sepetim</h1>
        <button
          onClick={() => clear.mutate()}
          disabled={busy}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          Sepeti Temizle
        </button>
      </div>

      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {b.items.map((item) => (
          <div key={item.productId} className="flex items-center gap-4 p-4">
            <div className="flex-1">
              <Link
                to={`/products/${item.productId}`}
                className="font-medium text-gray-900 hover:text-indigo-700"
              >
                {item.productName}
              </Link>
              <p className="text-sm text-gray-500">
                Birim fiyat: <Money amount={item.unitPrice} />
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  item.quantity > 1
                    ? updateQuantity.mutate({ productId: item.productId, quantity: item.quantity - 1 })
                    : removeItem.mutate(item.productId)
                }
                disabled={busy}
                className="size-8 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
              <button
                onClick={() =>
                  updateQuantity.mutate({ productId: item.productId, quantity: item.quantity + 1 })
                }
                disabled={busy}
                className="size-8 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                +
              </button>
            </div>
            <Money
              amount={item.unitPrice * item.quantity}
              className="w-24 text-right font-semibold"
            />
            <button
              onClick={() => removeItem.mutate(item.productId)}
              disabled={busy}
              className="text-sm text-gray-400 hover:text-red-600 disabled:opacity-50"
              aria-label={`${item.productName} ürününü sepetten çıkar`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
        <span className="text-lg font-semibold">
          Toplam: <Money amount={b.totalAmount} className="text-indigo-700" />
        </span>
        <Link
          to="/checkout"
          className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Siparişi Tamamla
        </Link>
      </div>
    </div>
  )
}

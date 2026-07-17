import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { basketApi } from '@/api/basket'
import type { CustomerBasket } from '@/api/types'
import { Money } from '@/components/Money'
import { ProductImage } from '@/components/ProductImage'
import { Spinner } from '@/components/Spinner'
import { useToast } from '@/components/Toaster'
import { btnPrimary, card, linkBlue } from '@/components/ui'

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
      <div className={`${card} mx-auto max-w-2xl py-16 text-center`}>
        <span className="text-6xl">🛒</span>
        <h1 className="mt-4 text-2xl font-bold">Sepetiniz boş</h1>
        <p className="mt-2 text-gray-500">Kampanyalı ürünlere göz atıp sepetinizi doldurun.</p>
        <Link to="/products" className={`${btnPrimary} mt-6 inline-block`}>
          Alışverişe Başla
        </Link>
      </div>
    )

  const busy = updateQuantity.isPending || removeItem.isPending || clear.isPending
  const itemCount = b.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className={`${card} min-w-0 flex-1 p-5`}>
        <div className="flex items-baseline justify-between border-b border-gray-200 pb-3">
          <h1 className="text-2xl font-semibold">Alışveriş Sepeti</h1>
          <button
            onClick={() => clear.mutate()}
            disabled={busy}
            className={`text-sm ${linkBlue} disabled:opacity-50`}
          >
            Sepeti boşalt
          </button>
        </div>

        {b.items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center gap-4 border-b border-gray-100 py-4"
          >
            <Link to={`/products/${item.productId}`} className="shrink-0">
              <ProductImage
                productId={item.productId}
                name={item.productName}
                className="size-24 rounded-md"
                emojiClassName="text-4xl"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                to={`/products/${item.productId}`}
                className="font-medium text-gray-900 hover:text-[#c45500]"
              >
                {item.productName}
              </Link>
              <p className="mt-0.5 text-xs text-[#007600]">Stok durumuna göre gönderilir</p>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <div className="flex items-center overflow-hidden rounded-full border border-[#d5d9d9] shadow-sm">
                  <button
                    onClick={() =>
                      item.quantity > 1
                        ? updateQuantity.mutate({
                            productId: item.productId,
                            quantity: item.quantity - 1,
                          })
                        : removeItem.mutate(item.productId)
                    }
                    disabled={busy}
                    className="px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
                    aria-label="Azalt"
                  >
                    {item.quantity > 1 ? '−' : '🗑'}
                  </button>
                  <span className="border-x border-[#d5d9d9] px-3 py-1 font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity.mutate({ productId: item.productId, quantity: item.quantity + 1 })
                    }
                    disabled={busy}
                    className="px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
                    aria-label="Artır"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem.mutate(item.productId)}
                  disabled={busy}
                  className={`${linkBlue} disabled:opacity-50`}
                >
                  Sil
                </button>
              </div>
            </div>
            <Money
              amount={item.unitPrice * item.quantity}
              className="text-lg font-semibold whitespace-nowrap"
            />
          </div>
        ))}

        <p className="pt-3 text-right text-lg">
          Ara toplam ({itemCount} ürün):{' '}
          <Money amount={b.totalAmount} className="font-semibold" />
        </p>
      </div>

      {/* Özet kutusu */}
      <div className={`${card} h-fit w-full shrink-0 p-5 lg:w-72`}>
        <p className="text-lg">
          Ara toplam ({itemCount} ürün):{' '}
          <Money amount={b.totalAmount} className="font-semibold" />
        </p>
        <p className="mt-1 text-xs text-[#007600]">Siparişiniz kargo bedava!</p>
        <Link to="/checkout" className={`${btnPrimary} mt-4 block w-full text-center`}>
          Siparişi Tamamla
        </Link>
      </div>
    </div>
  )
}

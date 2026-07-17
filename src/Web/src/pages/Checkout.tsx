import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { basketApi } from '@/api/basket'
import { ordersApi } from '@/api/orders'
import type { CustomerBasket } from '@/api/types'
import { Money } from '@/components/Money'
import { Spinner } from '@/components/Spinner'
import { useToast } from '@/components/Toaster'

import { btnPrimary, card, input as inputClass, linkBlue } from '@/components/ui'

export function Checkout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const basket = useQuery({ queryKey: ['basket'], queryFn: basketApi.get })

  const [shippingAddress, setShippingAddress] = useState('')
  const [cardNumber, setCardNumber] = useState('')

  const createOrder = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: (order) => {
      // Backend, OrderCreated eventiyle sepeti asenkron temizler; cache'i hemen boşaltıyoruz.
      queryClient.setQueryData<CustomerBasket>(['basket'], (old) =>
        old ? { ...old, items: [], totalAmount: 0 } : old,
      )
      queryClient.setQueryData(['order', order.id], order)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast('Siparişiniz alındı, işleniyor…', 'info')
      navigate(`/orders/${order.id}`)
    },
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
  if (b.items.length === 0 && !createOrder.isPending && !createOrder.isSuccess)
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Sepetiniz boş</h1>
        <p className="mt-2 text-gray-500">Sipariş verebilmek için önce sepete ürün ekleyin.</p>
        <Link to="/products" className={`mt-4 inline-block ${linkBlue}`}>
          Ürünlere göz at →
        </Link>
      </div>
    )

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    createOrder.mutate({
      items: b.items.map(({ productId, productName, unitPrice, quantity }) => ({
        productId,
        productName,
        unitPrice,
        quantity,
      })),
      shippingAddress,
      cardNumber,
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Siparişi Tamamla</h1>

      <div className={`${card} mb-6 p-4`}>
        <h2 className="mb-3 font-semibold">Sipariş Özeti</h2>
        <ul className="space-y-1 text-sm text-gray-700">
          {b.items.map((item) => (
            <li key={item.productId} className="flex justify-between">
              <span>
                {item.productName} × {item.quantity}
              </span>
              <Money amount={item.unitPrice * item.quantity} />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 font-semibold">
          <span>Toplam</span>
          <Money amount={b.totalAmount} className="text-indigo-700" />
        </div>
      </div>

      <form onSubmit={onSubmit} className={`${card} space-y-4 p-6`}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Teslimat Adresi</span>
          <textarea
            required
            maxLength={1000}
            rows={3}
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            placeholder="Atatürk Cad. No:1 İstanbul"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Kart Numarası</span>
          <input
            required
            inputMode="numeric"
            pattern="[0-9 ]{12,23}"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="4111 1111 1111 1111"
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-gray-500">
            Demo ödeme: 0002 ile biten kart (örn. 4000 0000 0000 0002) reddedilir ve sipariş iptal
            akışını (saga compensation) tetikler.
          </span>
        </label>
        <button type="submit" disabled={createOrder.isPending} className={`${btnPrimary} w-full`}>
          {createOrder.isPending ? 'Sipariş veriliyor…' : 'Siparişi Ver'}
        </button>
      </form>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ordersApi } from '@/api/orders'
import { Money } from '@/components/Money'
import { Spinner } from '@/components/Spinner'
import { StatusBadge } from '@/components/StatusBadge'
import { ProductImage } from '@/components/ProductImage'
import { card, linkBlue } from '@/components/ui'

export function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const order = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
    enabled: !!id,
    // SignalR asıl kaynak; Pending'de 3 sn'lik poll emniyet kemeri.
    refetchInterval: (query) => (query.state.data?.status === 'Pending' ? 3000 : false),
  })

  if (order.isPending) return <Spinner fullPage />
  if (order.isError)
    return (
      <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
        Sipariş yüklenemedi: {order.error.message}
      </p>
    )

  const o = order.data
  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-4 text-sm text-gray-500">
        <Link to="/orders" className={linkBlue}>
          Siparişlerim
        </Link>
        {' › '}
        <span className="font-mono">#{o.id.slice(0, 8)}</span>
      </nav>

      <div className={`${card} p-6`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">Sipariş #{o.id.slice(0, 8)}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {new Date(o.createdAtUtc).toLocaleString('tr-TR')}
            </p>
          </div>
          <StatusBadge status={o.status} />
        </div>

        {o.status === 'Pending' && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Ödemeniz işleniyor — stok rezervasyonu ve ödeme adımları tamamlandığında durum otomatik
            güncellenir.
          </p>
        )}
        {o.status === 'Cancelled' && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <span className="font-semibold">Sipariş iptal edildi.</span>{' '}
            {o.cancellationReason ?? 'Neden belirtilmedi.'} Rezerve edilen stok iade edildi.
          </p>
        )}
        {o.status === 'Confirmed' && (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Siparişiniz onaylandı; ödeme alındı ve stok ayrıldı.
          </p>
        )}

        <h2 className="mt-6 mb-2 font-semibold">Ürünler</h2>
        <ul className="divide-y divide-gray-100 rounded-md border border-gray-100">
          {o.items.map((item) => (
            <li key={item.productId} className="flex items-center gap-3 p-3 text-sm">
              <ProductImage
                productId={item.productId}
                name={item.productName}
                className="size-12 rounded-md"
                emojiClassName="text-xl"
              />
              <Link to={`/products/${item.productId}`} className={`flex-1 ${linkBlue}`}>
                {item.productName} × {item.quantity}
              </Link>
              <Money amount={item.unitPrice * item.quantity} />
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-between border-t border-gray-100 pt-4">
          <span className="font-semibold">Toplam</span>
          <Money amount={o.totalAmount} className="text-lg font-bold text-indigo-700" />
        </div>

        <h2 className="mt-6 mb-1 font-semibold">Teslimat Adresi</h2>
        <p className="text-sm whitespace-pre-line text-gray-700">{o.shippingAddress}</p>
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ordersApi } from '@/api/orders'
import { EmptyState, ErrorState } from '@/components/Feedback'
import { PackageIcon } from '@/components/icons'
import { Money } from '@/components/Money'
import { ProductImage } from '@/components/ProductImage'
import { Spinner } from '@/components/Spinner'
import { StatusBadge } from '@/components/StatusBadge'
import { btnPrimary, btnSecondary, card, linkBlue } from '@/components/ui'

export function Orders() {
  const orders = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list })

  if (orders.isPending) return <Spinner fullPage />
  if (orders.isError)
    return (
      <ErrorState
        message={`Siparişler yüklenemedi: ${orders.error.message}`}
        onRetry={() => orders.refetch()}
      />
    )

  if (orders.data.length === 0)
    return (
      <EmptyState
        icon={<PackageIcon size={32} />}
        title="Henüz siparişiniz yok"
        action={
          <Link to="/products" className={btnPrimary}>
            Alışverişe Başla
          </Link>
        }
      />
    )

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-2xl font-semibold">Siparişlerim</h1>
      <div className="space-y-4">
        {orders.data.map((order) => (
          <div key={order.id} className={`${card} overflow-hidden`}>
            {/* Amazon tarzı gri başlık şeridi */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-1 border-b border-gray-200 bg-[#f0f2f2] px-5 py-3 text-xs text-gray-600">
              <div>
                <p className="uppercase">Sipariş tarihi</p>
                <p className="text-sm text-gray-900">
                  {new Date(order.createdAtUtc).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <div>
                <p className="uppercase">Toplam</p>
                <Money amount={order.totalAmount} className="text-sm text-gray-900" />
              </div>
              <div className="min-w-0">
                <p className="uppercase">Sipariş no</p>
                <p className="truncate font-mono text-sm text-gray-900">#{order.id.slice(0, 8)}</p>
              </div>
              <div className="ml-auto">
                <StatusBadge status={order.status} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="flex -space-x-3">
                {order.items.slice(0, 3).map((item) => (
                  <ProductImage
                    key={item.productId}
                    productId={item.productId}
                    name={item.productName}
                    className="size-14 rounded-full border-2 border-white"
                    iconClassName="size-7"
                  />
                ))}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                {order.items.slice(0, 2).map((item) => (
                  <p key={item.productId} className="truncate">
                    {item.productName} × {item.quantity}
                  </p>
                ))}
                {order.items.length > 2 && (
                  <p className="text-gray-500">+{order.items.length - 2} ürün daha</p>
                )}
                {order.status === 'Cancelled' && order.cancellationReason && (
                  <p className="mt-1 text-xs text-price">{order.cancellationReason}</p>
                )}
              </div>
              <Link to={`/orders/${order.id}`} className={btnSecondary}>
                Sipariş detayı
              </Link>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm">
        <Link to="/products" className={linkBlue}>
          Alışverişe devam et →
        </Link>
      </p>
    </div>
  )
}

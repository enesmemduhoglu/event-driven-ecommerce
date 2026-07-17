import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ordersApi } from '@/api/orders'
import { Money } from '@/components/Money'
import { Spinner } from '@/components/Spinner'
import { StatusBadge } from '@/components/StatusBadge'

export function Orders() {
  const orders = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list })

  if (orders.isPending) return <Spinner fullPage />
  if (orders.isError)
    return (
      <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
        Siparişler yüklenemedi: {orders.error.message}
      </p>
    )

  if (orders.data.length === 0)
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Henüz siparişiniz yok</h1>
        <Link to="/products" className="mt-4 inline-block text-indigo-600 hover:underline">
          Alışverişe başla →
        </Link>
      </div>
    )

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Siparişlerim</h1>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {orders.data.map((order) => (
          <Link
            key={order.id}
            to={`/orders/${order.id}`}
            className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50"
          >
            <div>
              <p className="font-mono text-sm text-gray-500">#{order.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-600">
                {new Date(order.createdAtUtc).toLocaleString('tr-TR')} · {order.items.length} ürün
              </p>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={order.status} />
              <Money amount={order.totalAmount} className="font-semibold" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ordersApi } from '@/api/orders'
import type { OrderDto, OrderStatus } from '@/api/types'
import { ErrorState } from '@/components/Feedback'
import { formatMoney } from '@/components/Money'
import { Pagination } from '@/components/Pagination'
import { Spinner } from '@/components/Spinner'
import { StatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/components/Toaster'
import { card, linkBlue } from '@/components/ui'

const PAGE_SIZE = 10

const STATUS_FILTERS: { value: '' | OrderStatus; label: string }[] = [
  { value: '', label: 'Tümü' },
  { value: 'Pending', label: 'İşleniyor' },
  { value: 'Confirmed', label: 'Onaylandı' },
  { value: 'Shipped', label: 'Kargoya Verildi' },
  { value: 'Delivered', label: 'Teslim Edildi' },
  { value: 'Cancelled', label: 'İptal Edildi' },
]

function ActionCell({ order }: { order: OrderDto }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const advance = useMutation({
    mutationFn: () =>
      order.status === 'Confirmed' ? ordersApi.ship(order.id) : ordersApi.deliver(order.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      toast(
        data.status === 'Shipped' ? 'Sipariş kargoya verildi' : 'Sipariş teslim edildi olarak işaretlendi',
        'success',
      )
    },
    onError: (err) => toast(err.message, 'error'),
  })

  if (order.status !== 'Confirmed' && order.status !== 'Shipped') {
    return <span className="text-xs text-gray-400">—</span>
  }

  return (
    <button
      onClick={() => advance.mutate()}
      disabled={advance.isPending}
      className={`text-sm ${linkBlue} disabled:opacity-50`}
    >
      {advance.isPending
        ? 'Güncelleniyor…'
        : order.status === 'Confirmed'
          ? 'Kargoya Ver'
          : 'Teslim Edildi'}
    </button>
  )
}

export function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const statusFilter = (searchParams.get('status') ?? '') as '' | OrderStatus

  const orders = useQuery({
    queryKey: ['admin-orders', { page, status: statusFilter }],
    queryFn: () =>
      ordersApi.listAll({ status: statusFilter || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  function updateParams(nextPage: number, nextStatus: '' | OrderStatus) {
    const params = new URLSearchParams()
    if (nextPage > 1) params.set('page', String(nextPage))
    if (nextStatus) params.set('status', nextStatus)
    setSearchParams(params)
  }

  return (
    <div className={`${card} p-5`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Siparişler</h1>
        <select
          value={statusFilter}
          aria-label="Duruma göre filtrele"
          onChange={(e) => updateParams(1, e.target.value as '' | OrderStatus)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-focus focus:ring-2 focus:ring-focus/30 focus:outline-none"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {orders.isPending ? (
        <Spinner fullPage />
      ) : orders.isError ? (
        <ErrorState
          message={`Siparişler yüklenemedi: ${orders.error.message}`}
          onRetry={() => orders.refetch()}
        />
      ) : orders.data.items.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          {statusFilter ? 'Bu durumda sipariş yok.' : 'Henüz sipariş yok.'}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                  <th className="py-2 pr-3">Sipariş</th>
                  <th className="py-2 pr-3">Müşteri</th>
                  <th className="py-2 pr-3">Tarih</th>
                  <th className="py-2 pr-3">Tutar</th>
                  <th className="py-2 pr-3">Durum</th>
                  <th className="py-2">İşlem</th>
                </tr>
              </thead>
              <tbody className={orders.isPlaceholderData ? 'opacity-60' : ''}>
                {orders.data.items.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3">
                      <Link to={`/orders/${o.id}`} className={`font-mono ${linkBlue}`}>
                        #{o.id.slice(0, 8)}
                      </Link>
                      <span className="ml-2 text-xs text-gray-400">
                        {o.items.length} ürün
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{o.userEmail}</td>
                    <td className="py-2 pr-3 text-gray-600">
                      {new Date(o.createdAtUtc).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-2 pr-3 font-medium">{formatMoney(o.totalAmount)}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-2">
                      <ActionCell order={o} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={orders.data.page}
            totalPages={orders.data.totalPages}
            onPageChange={(p) => updateParams(p, statusFilter)}
          />
        </>
      )}
    </div>
  )
}

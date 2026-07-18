import type { OrderStatus } from '@/api/types'

const STYLES: Record<OrderStatus, string> = {
  Pending: 'bg-amber-100 text-amber-800 animate-pulse',
  Confirmed: 'bg-emerald-100 text-emerald-800',
  Cancelled: 'bg-red-100 text-red-700',
  Shipped: 'bg-sky-100 text-sky-800',
  Delivered: 'bg-green-100 text-green-800',
}

const LABELS: Record<OrderStatus, string> = {
  Pending: 'İşleniyor',
  Confirmed: 'Onaylandı',
  Cancelled: 'İptal Edildi',
  Shipped: 'Kargoya Verildi',
  Delivered: 'Teslim Edildi',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  )
}

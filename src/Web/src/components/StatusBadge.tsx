import type { OrderStatus } from '@/api/types'

const STYLES: Record<OrderStatus, string> = {
  Pending: 'bg-amber-100 text-amber-800 animate-pulse',
  Confirmed: 'bg-emerald-100 text-emerald-800',
  Cancelled: 'bg-red-100 text-red-700',
}

const LABELS: Record<OrderStatus, string> = {
  Pending: 'İşleniyor',
  Confirmed: 'Onaylandı',
  Cancelled: 'İptal Edildi',
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

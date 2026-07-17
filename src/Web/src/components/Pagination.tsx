interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

const buttonClass =
  'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white'

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={buttonClass}>
        ← Önceki
      </button>
      <span className="text-sm text-gray-600">
        Sayfa {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={buttonClass}
      >
        Sonraki →
      </button>
    </div>
  )
}

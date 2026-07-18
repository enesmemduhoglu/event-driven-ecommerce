import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

const buttonClass =
  'inline-flex min-h-11 items-center gap-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white'

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Sayfalama">
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={buttonClass}>
        <ChevronLeftIcon size={16} />
        Önceki
      </button>
      <span className="text-sm text-gray-600">
        Sayfa {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={buttonClass}
      >
        Sonraki
        <ChevronRightIcon size={16} />
      </button>
    </nav>
  )
}

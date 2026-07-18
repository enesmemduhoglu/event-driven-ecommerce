import { StarIcon } from '@/components/icons'
import { hashCode } from './ProductImage'

// Backend'de puanlama olmadığından ürün kimliğinden deterministik demo puanı üretilir.
export function pseudoRating(id: string): { rating: number; count: number } {
  const h = hashCode(id)
  return { rating: 3.5 + (h % 16) / 10, count: 24 + (h % 476) }
}

function StarRow({ className }: { className: string }) {
  return (
    <span className={`flex ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <StarIcon key={i} size={16} className="shrink-0 fill-current" />
      ))}
    </span>
  )
}

export function Stars({ id, showCount = true }: { id: string; showCount?: boolean }) {
  const { rating, count } = pseudoRating(id)
  return (
    <span className="flex items-center gap-1.5 text-sm">
      <span
        className="relative inline-flex"
        role="img"
        aria-label={`5 üzerinden ${rating.toFixed(1)} yıldız`}
      >
        <StarRow className="text-gray-300" />
        {/* Kısmi doluluk: turuncu kopya, puan oranında soldan kırpılır. */}
        <span
          className="absolute top-0 left-0 h-full overflow-hidden"
          style={{ width: `${(rating / 5) * 100}%` }}
          aria-hidden="true"
        >
          <StarRow className="text-accent" />
        </span>
      </span>
      {showCount && <span className="text-xs text-link">{count.toLocaleString('tr-TR')}</span>}
    </span>
  )
}

import { hashCode } from './ProductImage'

// Backend'de puanlama olmadığından ürün kimliğinden deterministik demo puanı üretilir.
export function pseudoRating(id: string): { rating: number; count: number } {
  const h = hashCode(id)
  return { rating: 3.5 + (h % 16) / 10, count: 24 + (h % 476) }
}

export function Stars({ id, showCount = true }: { id: string; showCount?: boolean }) {
  const { rating, count } = pseudoRating(id)
  const rounded = Math.round(rating)
  return (
    <span className="flex items-center gap-1 text-sm">
      <span className="tracking-tight text-[#ffa41c]" aria-label={`${rating.toFixed(1)} yıldız`}>
        {'★'.repeat(rounded)}
        <span className="text-gray-300">{'★'.repeat(5 - rounded)}</span>
      </span>
      {showCount && <span className="text-xs text-[#007185]">{count.toLocaleString('tr-TR')}</span>}
    </span>
  )
}

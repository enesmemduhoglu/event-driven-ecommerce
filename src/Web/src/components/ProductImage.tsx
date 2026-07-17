// Backend'de ürün görseli olmadığı için ürün kimliğinden türetilen deterministik
// bir placeholder üretilir (aynı ürün her zaman aynı görünür).

export function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const EMOJI_RULES: Array<[RegExp, string]> = [
  [/telefon|phone|iphone|samsung|elektronik|electronic/i, '📱'],
  [/laptop|bilgisayar|computer|mouse|klavye|keyboard|monitor/i, '💻'],
  [/kulakl[ıi]k|headphone|hoparl[öo]r|speaker|ses|audio/i, '🎧'],
  [/kitap|book/i, '📚'],
  [/ev|home|ya[şs]am|mutfak|kitchen|airfryer|f[ıi]r[ıi]n/i, '🍳'],
  [/giyim|moda|fashion|clothing|ayakkab[ıi]|shoe/i, '👕'],
  [/oyuncak|toy|oyun|game/i, '🎮'],
  [/spor|sport|fitness/i, '⚽'],
  [/bahçe|garden|outdoor/i, '🌿'],
]

function emojiFor(text: string): string {
  return EMOJI_RULES.find(([re]) => re.test(text))?.[1] ?? '📦'
}

interface ProductImageProps {
  productId: string
  name: string
  categoryName?: string
  className?: string
  emojiClassName?: string
}

export function ProductImage({
  productId,
  name,
  categoryName = '',
  className = '',
  emojiClassName = 'text-6xl',
}: ProductImageProps) {
  const hue = hashCode(productId) % 360
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 45% 95%), hsl(${hue} 40% 86%))`,
      }}
      aria-hidden="true"
    >
      <span className={emojiClassName}>{emojiFor(`${categoryName} ${name}`)}</span>
    </div>
  )
}

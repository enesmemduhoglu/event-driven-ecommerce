// Yüklenmiş görsel varsa onu gösterir; yoksa (veya yüklenemezse) ürün kimliğinden
// türetilen deterministik placeholder'a düşer (aynı ürün her zaman aynı görünür).

import { useState } from 'react'
import type { ComponentType } from 'react'
import { API_URL } from '@/api/http'
import {
  BookOpenIcon,
  ChefHatIcon,
  DumbbellIcon,
  GamepadIcon,
  HeadphonesIcon,
  LaptopIcon,
  LeafIcon,
  PackageIcon,
  ShirtIcon,
  SmartphoneIcon,
} from '@/components/icons'
import type { IconProps } from '@/components/icons'

export function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const ICON_RULES: Array<[RegExp, ComponentType<IconProps>]> = [
  [/telefon|phone|iphone|samsung|elektronik|electronic/i, SmartphoneIcon],
  [/laptop|bilgisayar|computer|mouse|klavye|keyboard|monitor/i, LaptopIcon],
  [/kulakl[ıi]k|headphone|hoparl[öo]r|speaker|ses|audio/i, HeadphonesIcon],
  [/kitap|book/i, BookOpenIcon],
  [/ev|home|ya[şs]am|mutfak|kitchen|airfryer|f[ıi]r[ıi]n/i, ChefHatIcon],
  [/giyim|moda|fashion|clothing|ayakkab[ıi]|shoe/i, ShirtIcon],
  [/oyuncak|toy|oyun|game/i, GamepadIcon],
  [/spor|sport|fitness/i, DumbbellIcon],
  [/bahçe|garden|outdoor/i, LeafIcon],
]

function iconFor(text: string): ComponentType<IconProps> {
  return ICON_RULES.find(([re]) => re.test(text))?.[1] ?? PackageIcon
}

interface ProductImageProps {
  productId: string
  name: string
  categoryName?: string
  imageUrl?: string | null
  className?: string
  /** Placeholder ikonunun boyutu, ör. "size-16". */
  iconClassName?: string
}

export function ProductImage({
  productId,
  name,
  categoryName = '',
  imageUrl,
  className = '',
  iconClassName = 'size-16',
}: ProductImageProps) {
  const [failed, setFailed] = useState(false)

  if (imageUrl && !failed) {
    return (
      <img
        src={`${API_URL}${imageUrl}`}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    )
  }

  const hue = hashCode(productId) % 360
  const CategoryIcon = iconFor(`${categoryName} ${name}`)
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 45% 95%), hsl(${hue} 40% 86%))`,
        color: `hsl(${hue} 35% 42%)`,
      }}
      aria-hidden="true"
    >
      <CategoryIcon className={iconClassName} />
    </div>
  )
}

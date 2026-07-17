import { Link } from 'react-router-dom'
import { Money } from '@/components/Money'
import type { ProductDto } from '@/api/types'

export function ProductCard({ product }: { product: ProductDto }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm"
    >
      <span className="text-xs font-medium tracking-wide text-indigo-600 uppercase">
        {product.categoryName}
      </span>
      <h3 className="mt-1 font-semibold text-gray-900">{product.name}</h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-gray-500">{product.description}</p>
      <Money amount={product.price} className="mt-3 text-lg font-bold text-gray-900" />
    </Link>
  )
}

import { Link } from 'react-router-dom'
import { Money } from '@/components/Money'
import { ProductImage } from '@/components/ProductImage'
import { Stars } from '@/components/Stars'
import type { ProductDto } from '@/api/types'

export function ProductCard({ product }: { product: ProductDto }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex flex-col bg-white p-4 transition hover:shadow-lg"
    >
      <ProductImage
        productId={product.id}
        name={product.name}
        categoryName={product.categoryName}
        imageUrl={product.imageUrl}
        className="aspect-square w-full rounded-md"
      />
      <h3 className="mt-3 line-clamp-2 text-sm text-gray-900 group-hover:text-[#c45500]">
        {product.name}
      </h3>
      <Stars id={product.id} />
      <Money amount={product.price} className="mt-1 text-xl font-semibold text-gray-900" />
      <span className="mt-auto pt-1 text-xs text-gray-500">{product.categoryName}</span>
    </Link>
  )
}

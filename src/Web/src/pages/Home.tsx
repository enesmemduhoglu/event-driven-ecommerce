import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { catalogApi } from '@/api/catalog'
import { ProductCard } from '@/components/ProductCard'
import { ProductImage } from '@/components/ProductImage'
import { Spinner } from '@/components/Spinner'
import { card, linkBlue } from '@/components/ui'

export function Home() {
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const latest = useQuery({
    queryKey: ['products', { page: 1, pageSize: 12 }],
    queryFn: () => catalogApi.products({ page: 1, pageSize: 12 }),
  })

  return (
    <div className="space-y-6">
      {/* Hero bandı */}
      <section className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#232f3e] via-[#37475a] to-[#232f3e] px-8 py-14 text-white">
        <h1 className="text-3xl font-bold">
          Aradığınız her şey <span className="text-[#febd69]">tek adreste</span>
        </h1>
        <p className="mt-2 max-w-xl text-gray-300">
          Binlerce üründe kampanyalı fiyatlar. Siparişiniz saga orkestrasyonuyla saniyeler içinde
          onaylanır, durumu anlık bildirimlerle takip edersiniz.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-full bg-[#ffd814] px-6 py-2.5 text-sm font-medium text-gray-900 hover:bg-[#f7ca00]"
        >
          Alışverişe Başla
        </Link>
      </section>

      {/* Kategori kartları */}
      {categories.data && categories.data.length > 0 && (
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.data.slice(0, 4).map((c) => (
            <div key={c.id} className={`${card} p-4`}>
              <h2 className="mb-3 font-bold">{c.name}</h2>
              <Link to={`/products?categoryId=${c.id}`}>
                <ProductImage
                  productId={c.id}
                  name={c.name}
                  categoryName={c.name}
                  className="aspect-square w-full rounded-md"
                  emojiClassName="text-7xl"
                />
              </Link>
              <Link to={`/products?categoryId=${c.id}`} className={`mt-3 block text-sm ${linkBlue}`}>
                Daha fazlasını gör
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* Ürün rafı */}
      <section className={`${card} p-5`}>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Son Eklenen Ürünler</h2>
          <Link to="/products" className={`text-sm ${linkBlue}`}>
            Tümünü gör
          </Link>
        </div>
        {latest.isPending ? (
          <Spinner />
        ) : latest.isError ? (
          <p className="text-sm text-gray-500">Ürünler yüklenemedi.</p>
        ) : latest.data.items.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz ürün yok.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {latest.data.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

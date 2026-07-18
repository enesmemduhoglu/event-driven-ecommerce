import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { catalogApi } from '@/api/catalog'
import { ErrorState } from '@/components/Feedback'
import { ProductCard } from '@/components/ProductCard'
import { ProductGridSkeleton } from '@/components/Skeleton'
import { ProductImage } from '@/components/ProductImage'
import { btnPrimary, card, linkBlue } from '@/components/ui'

export function Home() {
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const latest = useQuery({
    queryKey: ['products', { page: 1, pageSize: 12 }],
    queryFn: () => catalogApi.products({ page: 1, pageSize: 12 }),
  })

  return (
    <div className="space-y-6">
      {/* Hero bandı */}
      <section className="relative overflow-hidden rounded-lg bg-gradient-to-r from-navy via-navy-soft to-navy px-8 py-14 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(600px circle at 85% 20%, rgba(255,153,0,0.25), transparent 60%)',
          }}
          aria-hidden="true"
        />
        <div className="relative">
          <h1 className="text-3xl font-bold">
            Aradığınız her şey <span className="text-brand-soft">tek adreste</span>
          </h1>
          <p className="mt-2 max-w-xl text-gray-300">
            Binlerce üründe kampanyalı fiyatlar. Siparişiniz saga orkestrasyonuyla saniyeler içinde
            onaylanır, durumu anlık bildirimlerle takip edersiniz.
          </p>
          <Link to="/products" className={`${btnPrimary} mt-6`}>
            Alışverişe Başla
          </Link>
        </div>
      </section>

      {/* Kategori kartları */}
      {categories.data && categories.data.length > 0 && (
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.data.slice(0, 4).map((c) => (
            <div key={c.id} className={`${card} p-4`}>
              <h2 className="mb-3 font-bold">{c.name}</h2>
              <Link to={`/products?categoryId=${c.id}`} className="group block">
                <ProductImage
                  productId={c.id}
                  name={c.name}
                  categoryName={c.name}
                  className="aspect-square w-full rounded-md transition-opacity duration-150 group-hover:opacity-90"
                  iconClassName="size-20"
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
          <ProductGridSkeleton
            count={6}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          />
        ) : latest.isError ? (
          <ErrorState message="Ürünler yüklenemedi." onRetry={() => latest.refetch()} />
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

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { catalogApi } from '@/api/catalog'
import { ProductCard } from '@/components/ProductCard'
import { Spinner } from '@/components/Spinner'

export function Home() {
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const latest = useQuery({
    queryKey: ['products', { page: 1, pageSize: 8 }],
    queryFn: () => catalogApi.products({ page: 1, pageSize: 8 }),
  })

  return (
    <div>
      <section className="rounded-2xl bg-indigo-600 px-8 py-12 text-center text-white">
        <h1 className="text-3xl font-bold">E-Ticaret Platformu</h1>
        <p className="mx-auto mt-3 max-w-xl text-indigo-100">
          Event-driven mikroservis mimarisi üzerinde çalışan demo mağaza. Ürünlere göz atın, sepete
          ekleyin ve sipariş akışını (saga orkestrasyonu) canlı izleyin.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-md bg-white px-5 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
        >
          Ürünlere Göz At
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">Kategoriler</h2>
        {categories.isPending ? (
          <Spinner />
        ) : categories.isError ? (
          <p className="text-sm text-gray-500">Kategoriler yüklenemedi.</p>
        ) : categories.data.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz kategori yok.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.data.map((c) => (
              <Link
                key={c.id}
                to={`/products?categoryId=${c.id}`}
                className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm hover:border-indigo-400 hover:text-indigo-700"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">Son Eklenen Ürünler</h2>
        {latest.isPending ? (
          <Spinner />
        ) : latest.isError ? (
          <p className="text-sm text-gray-500">Ürünler yüklenemedi.</p>
        ) : latest.data.items.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz ürün yok.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {latest.data.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

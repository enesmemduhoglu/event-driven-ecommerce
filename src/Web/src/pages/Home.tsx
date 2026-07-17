import { Link } from 'react-router-dom'

// Phase 11.2'de kategoriler + son ürünlerle zenginleşecek.
export function Home() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-3xl font-bold">E-Ticaret Platformu</h1>
      <p className="mx-auto mt-3 max-w-xl text-gray-600">
        Event-driven mikroservis mimarisi üzerinde çalışan demo mağaza. Ürünlere göz atın, sepete
        ekleyin ve sipariş akışını (saga orkestrasyonu) canlı izleyin.
      </p>
      <Link
        to="/products"
        className="mt-6 inline-block rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Ürünlere Göz At
      </Link>
    </div>
  )
}

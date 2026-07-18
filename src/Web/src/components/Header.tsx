import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/auth/AuthContext'
import { basketApi } from '@/api/basket'
import { catalogApi } from '@/api/catalog'

export function Header() {
  const { user, status, logout } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const basket = useQuery({
    queryKey: ['basket'],
    queryFn: basketApi.get,
    enabled: status === 'authenticated',
  })
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })

  const itemCount = basket.data?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0

  function onSearch(e: FormEvent) {
    e.preventDefault()
    navigate(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')
  }

  return (
    <header className="sticky top-0 z-40 shadow">
      {/* Üst bar — koyu lacivert */}
      <div className="bg-[#131921] text-white">
        <div className="mx-auto flex h-[60px] max-w-[1480px] items-center gap-4 px-4">
          <Link
            to="/"
            className="rounded-sm border border-transparent px-2 py-1 text-xl font-bold hover:border-white"
          >
            e-ticaret<span className="text-[#ff9900]">.dev</span>
          </Link>

          <form onSubmit={onSearch} className="flex h-10 flex-1 overflow-hidden rounded-md">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ürün, kategori veya marka ara"
              className="min-w-0 flex-1 bg-white px-3 text-sm text-gray-900 focus:outline-none"
              aria-label="Arama"
            />
            <button
              type="submit"
              className="flex w-12 items-center justify-center bg-[#febd69] text-lg hover:bg-[#f3a847]"
              aria-label="Ara"
            >
              🔍
            </button>
          </form>

          {status === 'authenticated' && user ? (
            <Link
              to="/orders"
              className="rounded-sm border border-transparent px-2 py-1 leading-tight hover:border-white"
            >
              <span className="block text-xs text-gray-300">
                Merhaba, {user.fullName.split(' ')[0]}
              </span>
              <span className="block text-sm font-bold">Siparişlerim</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-sm border border-transparent px-2 py-1 leading-tight hover:border-white"
            >
              <span className="block text-xs text-gray-300">Merhaba, giriş yapın</span>
              <span className="block text-sm font-bold">Hesap</span>
            </Link>
          )}

          <Link
            to="/basket"
            className="relative flex items-end gap-1 rounded-sm border border-transparent px-2 py-1 hover:border-white"
            aria-label={`Sepet, ${itemCount} ürün`}
          >
            <span className="text-2xl">🛒</span>
            {itemCount > 0 && (
              <span className="absolute -top-1 left-6 rounded-full bg-[#ff9900] px-1.5 text-xs font-bold text-[#131921]">
                {itemCount}
              </span>
            )}
            <span className="text-sm font-bold">Sepet</span>
          </Link>
        </div>
      </div>

      {/* Alt bar — kategoriler ve navigasyon */}
      <div className="bg-[#232f3e] text-sm text-white">
        <div className="mx-auto flex h-10 max-w-[1480px] items-center gap-1 overflow-x-auto px-4">
          <NavLink
            to="/products"
            className="rounded-sm border border-transparent px-2 py-1 whitespace-nowrap hover:border-white"
          >
            ☰ Tüm Ürünler
          </NavLink>
          {categories.data?.slice(0, 6).map((c) => (
            <Link
              key={c.id}
              to={`/products?categoryId=${c.id}`}
              className="rounded-sm border border-transparent px-2 py-1 whitespace-nowrap hover:border-white"
            >
              {c.name}
            </Link>
          ))}
          <span className="flex-1" />
          {status === 'authenticated' ? (
            <button
              onClick={logout}
              className="rounded-sm border border-transparent px-2 py-1 whitespace-nowrap hover:border-white"
            >
              Çıkış Yap
            </button>
          ) : (
            <Link
              to="/register"
              className="rounded-sm border border-transparent px-2 py-1 whitespace-nowrap hover:border-white"
            >
              Kayıt Ol
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

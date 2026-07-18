import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/auth/AuthContext'
import { basketApi } from '@/api/basket'
import { catalogApi } from '@/api/catalog'
import { CartIcon, MenuIcon, SearchIcon } from '@/components/icons'

const headerLink =
  'rounded-sm border border-transparent px-2 py-1 transition-colors duration-150 hover:border-white'

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
      <div className="bg-ink text-white">
        <div className="mx-auto flex h-[60px] max-w-[1480px] items-center gap-4 px-4">
          <Link to="/" className={`${headerLink} text-xl font-bold`}>
            e-ticaret<span className="text-brand">.dev</span>
          </Link>

          <form
            onSubmit={onSearch}
            className="flex h-10 flex-1 overflow-hidden rounded-md ring-brand transition-shadow duration-150 focus-within:ring-2"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ürün, kategori veya marka ara"
              className="min-w-0 flex-1 bg-white px-3 text-sm text-gray-900 focus:outline-none"
              aria-label="Arama"
            />
            <button
              type="submit"
              className="flex w-12 items-center justify-center bg-brand-soft text-ink transition-colors duration-150 hover:bg-accent"
              aria-label="Ara"
            >
              <SearchIcon size={20} />
            </button>
          </form>

          {status === 'authenticated' && user ? (
            <Link to="/orders" className={`${headerLink} leading-tight`}>
              <span className="block text-xs text-gray-300">
                Merhaba, {user.fullName.split(' ')[0]}
              </span>
              <span className="block text-sm font-bold">Siparişlerim</span>
            </Link>
          ) : (
            <Link to="/login" className={`${headerLink} leading-tight`}>
              <span className="block text-xs text-gray-300">Merhaba, giriş yapın</span>
              <span className="block text-sm font-bold">Hesap</span>
            </Link>
          )}

          <Link
            to="/basket"
            className={`${headerLink} relative flex items-end gap-1.5`}
            aria-label={`Sepet, ${itemCount} ürün`}
          >
            <CartIcon size={28} />
            {itemCount > 0 && (
              <span className="absolute -top-1 left-6 rounded-full bg-brand px-1.5 text-xs font-bold text-ink">
                {itemCount}
              </span>
            )}
            <span className="text-sm font-bold">Sepet</span>
          </Link>
        </div>
      </div>

      {/* Alt bar — kategoriler ve navigasyon */}
      <div className="bg-navy text-sm text-white">
        <div className="mx-auto flex h-10 max-w-[1480px] items-center gap-1 overflow-x-auto px-4">
          <NavLink to="/products" className={`${headerLink} flex items-center gap-1.5 whitespace-nowrap`}>
            <MenuIcon size={16} />
            Tüm Ürünler
          </NavLink>
          {categories.data?.slice(0, 6).map((c) => (
            <Link
              key={c.id}
              to={`/products?categoryId=${c.id}`}
              className={`${headerLink} whitespace-nowrap`}
            >
              {c.name}
            </Link>
          ))}
          <span className="flex-1" />
          {status === 'authenticated' ? (
            <button onClick={logout} className={`${headerLink} whitespace-nowrap`}>
              Çıkış Yap
            </button>
          ) : (
            <Link to="/register" className={`${headerLink} whitespace-nowrap`}>
              Kayıt Ol
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

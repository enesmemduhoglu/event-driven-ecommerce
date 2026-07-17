import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
  }`

export function Header() {
  const { user, status, isAdmin, logout } = useAuth()

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="text-lg font-bold text-indigo-700">
          E-Ticaret
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          <NavLink to="/products" className={navLinkClass}>
            Ürünler
          </NavLink>
          <NavLink to="/search" className={navLinkClass}>
            Arama
          </NavLink>
          {status === 'authenticated' && (
            <>
              <NavLink to="/basket" className={navLinkClass}>
                Sepetim
              </NavLink>
              <NavLink to="/orders" className={navLinkClass}>
                Siparişlerim
              </NavLink>
            </>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        {status === 'authenticated' && user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.fullName}</span>
            <button
              onClick={logout}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Çıkış
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Giriş
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Kayıt Ol
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

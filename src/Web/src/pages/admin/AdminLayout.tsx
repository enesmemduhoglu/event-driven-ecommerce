import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardListIcon, PackageIcon, TagIcon } from '@/components/icons'
import { card } from '@/components/ui'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
    isActive ? 'bg-navy font-semibold text-white' : 'text-gray-700 hover:bg-gray-100'
  }`

export function AdminLayout() {
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <aside className={`${card} h-fit w-full shrink-0 p-3 md:w-52`}>
        <h2 className="px-3 py-2 text-xs font-bold tracking-wide text-gray-500 uppercase">
          Admin Paneli
        </h2>
        <nav className="space-y-1">
          <NavLink to="/admin/products" className={navClass}>
            <PackageIcon size={16} />
            Ürünler
          </NavLink>
          <NavLink to="/admin/categories" className={navClass}>
            <TagIcon size={16} />
            Kategoriler
          </NavLink>
          <NavLink to="/admin/orders" className={navClass}>
            <ClipboardListIcon size={16} />
            Siparişler
          </NavLink>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}

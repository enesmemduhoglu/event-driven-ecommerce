import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { useOrderNotifications } from '@/realtime/useOrderNotifications'

export function Layout() {
  // Oturum açıkken SignalR bağlantısını canlı tutar (sipariş durum bildirimleri).
  useOrderNotifications()
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

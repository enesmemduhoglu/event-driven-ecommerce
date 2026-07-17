import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { useOrderNotifications } from '@/realtime/useOrderNotifications'

export function Layout() {
  // Oturum açıkken SignalR bağlantısını canlı tutar (sipariş durum bildirimleri).
  useOrderNotifications()
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

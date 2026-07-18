import { useEffect } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/api/http'
import { tokenStore } from '@/auth/tokenStore'
import { useAuth } from '@/auth/AuthContext'
import { useToast } from '@/components/Toaster'
import { formatMoney } from '@/components/Money'
import type { OrderDto, OrderStatus } from '@/api/types'

interface OrderStatusChangedPayload {
  orderId: string
  status: OrderStatus
  totalAmount?: number
  reason?: string
}

// Notification.Api hub'ı yalnızca sahibi olan kullanıcıya push'lar; tek event: orderStatusChanged.
export function useOrderNotifications() {
  const { status } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (status !== 'authenticated') return

    const connection = new HubConnectionBuilder()
      // accessTokenFactory her (yeniden) bağlanışta store'dan okur → token yenilense de geçerli kalır.
      .withUrl(`${API_URL}/hubs/notifications`, {
        accessTokenFactory: () => tokenStore.getAccessToken() ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('orderStatusChanged', (payload: OrderStatusChangedPayload) => {
      if (payload.status === 'Confirmed') {
        toast(
          `Siparişiniz onaylandı${payload.totalAmount != null ? ` (${formatMoney(payload.totalAmount)})` : ''}`,
          'success',
        )
      } else if (payload.status === 'Cancelled') {
        toast(`Siparişiniz iptal edildi: ${payload.reason ?? 'bilinmeyen neden'}`, 'error')
      } else if (payload.status === 'Shipped') {
        toast('Siparişiniz kargoya verildi 🚚', 'success')
      } else if (payload.status === 'Delivered') {
        toast('Siparişiniz teslim edildi ✅', 'success')
      }

      queryClient.setQueryData<OrderDto | undefined>(['order', payload.orderId], (old) =>
        old
          ? { ...old, status: payload.status, cancellationReason: payload.reason ?? old.cancellationReason }
          : old,
      )
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      // İptalde stok iade edilir; ürün detayındaki stok görünümü tazelensin.
      if (payload.status === 'Cancelled') queryClient.invalidateQueries({ queryKey: ['inventory'] })
    })

    connection.start().catch((err) => console.warn('SignalR bağlantısı kurulamadı:', err))

    return () => {
      connection.stop()
    }
  }, [status, queryClient, toast])
}

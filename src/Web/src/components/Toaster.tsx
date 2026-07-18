import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { AlertCircleIcon, CheckCircleIcon, InfoIcon, XIcon } from '@/components/icons'
import type { IconProps } from '@/components/icons'

export type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const KIND_STYLES: Record<ToastKind, string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-gray-800',
}

const KIND_ICONS: Record<ToastKind, ComponentType<IconProps>> = {
  success: CheckCircleIcon,
  error: AlertCircleIcon,
  info: InfoIcon,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const lastMessage = useRef<{ message: string; at: number }>({ message: '', at: 0 })

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    // Aynı mesajı 3 sn içinde tekrarlama (ör. 429 fırtınasında tek uyarı).
    const now = Date.now()
    if (lastMessage.current.message === message && now - lastMessage.current.at < 3000) return
    lastMessage.current = { message, at: now }

    const id = nextId.current++
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => {
          const KindIcon = KIND_ICONS[t.kind]
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm text-white shadow-lg animate-[toast-in_200ms_ease-out] ${KIND_STYLES[t.kind]}`}
            >
              <KindIcon size={18} className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Bildirimi kapat"
                className="-m-1 rounded-md p-1 opacity-70 transition-opacity duration-150 hover:opacity-100"
              >
                <XIcon size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast, ToastProvider içinde kullanılmalı')
  return ctx
}

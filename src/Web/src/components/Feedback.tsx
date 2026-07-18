// Hata ve boş durum bileşenleri — her sayfada aynı görünüm ve erişilebilirlik.

import type { ReactNode } from 'react'
import { AlertCircleIcon } from '@/components/icons'
import { card } from '@/components/ui'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <AlertCircleIcon size={18} className="shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-full border border-red-300 px-4 py-1.5 font-medium transition-colors duration-150 hover:bg-red-100"
        >
          Tekrar dene
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  action,
  children,
}: {
  icon: ReactNode
  title: string
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className={`${card} mx-auto max-w-2xl px-6 py-16 text-center`}>
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        {icon}
      </span>
      <h1 className="mt-4 text-2xl font-bold">{title}</h1>
      {children && <p className="mt-2 text-gray-500">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

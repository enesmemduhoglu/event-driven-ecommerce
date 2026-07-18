// Amazon tarzı ortak buton/kart sınıfları — tek noktadan tutarlılık.
// Renkler index.css @theme token'larından gelir (cta, accent, link, price…).

const btnBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium shadow-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50'

export const btnPrimary = `${btnBase} bg-cta text-gray-900 hover:bg-cta-hover`

export const btnOrange = `${btnBase} bg-accent text-gray-900 hover:bg-accent-hover`

export const btnSecondary = `${btnBase} border border-gray-300 bg-white text-gray-900 hover:bg-gray-50`

export const card = 'rounded-lg border border-gray-200 bg-white shadow-sm'

export const linkBlue =
  'rounded-sm text-link underline-offset-2 transition-colors duration-150 hover:text-link-hover hover:underline'

export const input =
  'w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm shadow-inner transition-[border-color,box-shadow] duration-150 focus:border-focus focus:ring-2 focus:ring-focus/30 focus:outline-none'

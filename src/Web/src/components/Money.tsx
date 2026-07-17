const formatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })

export function formatMoney(amount: number): string {
  return formatter.format(amount)
}

export function Money({ amount, className }: { amount: number; className?: string }) {
  return <span className={className}>{formatMoney(amount)}</span>
}

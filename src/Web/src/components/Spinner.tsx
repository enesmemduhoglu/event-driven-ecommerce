export function Spinner({ fullPage = false }: { fullPage?: boolean }) {
  const spinner = (
    <div
      className="size-8 animate-spin rounded-full border-4 border-brand border-t-transparent"
      role="status"
      aria-label="Yükleniyor"
    />
  )
  if (!fullPage) return spinner
  return <div className="flex min-h-[50vh] items-center justify-center">{spinner}</div>
}

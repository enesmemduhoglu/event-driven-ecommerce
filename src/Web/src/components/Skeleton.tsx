// Skeleton yükleme ekranları — içerik gelmeden alanı rezerve eder (CLS önlenir).

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} aria-hidden="true" />
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-2/3" />
      <Skeleton className="mt-3 h-6 w-24" />
    </div>
  )
}

export function ProductGridSkeleton({
  count = 8,
  className = 'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4',
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={className} role="status" aria-label="Ürünler yükleniyor">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

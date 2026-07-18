import { ChevronUpIcon } from '@/components/icons'

export function Footer() {
  function scrollTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <footer className="mt-12">
      <button
        onClick={scrollTop}
        className="flex w-full items-center justify-center gap-1.5 bg-navy-soft py-3 text-sm text-white transition-colors duration-150 hover:bg-[#485769]"
      >
        <ChevronUpIcon size={16} />
        Başa dön
      </button>
      <div className="bg-navy py-8 text-center text-sm text-gray-300">
        <p className="font-semibold text-white">
          e-ticaret<span className="text-brand">.dev</span>
        </p>
        <p className="mx-auto mt-2 max-w-xl px-4">
          .NET 8 mikroservis mimarisi üzerinde event-driven demo mağaza — saga orkestrasyonu,
          transactional outbox, RabbitMQ, Elasticsearch ve SignalR ile.
        </p>
      </div>
      <div className="bg-ink py-4 text-center text-xs text-gray-400">
        © 2026 e-ticaret.dev — portfolyo projesidir, gerçek satış yapılmaz.
      </div>
    </footer>
  )
}

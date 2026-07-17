export function Footer() {
  return (
    <footer className="mt-12">
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="w-full bg-[#37475a] py-3 text-sm text-white hover:bg-[#485769]"
      >
        Başa dön
      </button>
      <div className="bg-[#232f3e] py-8 text-center text-sm text-gray-300">
        <p className="font-semibold text-white">e-ticaret.dev</p>
        <p className="mx-auto mt-2 max-w-xl px-4">
          .NET 8 mikroservis mimarisi üzerinde event-driven demo mağaza — saga orkestrasyonu,
          transactional outbox, RabbitMQ, Elasticsearch ve SignalR ile.
        </p>
      </div>
      <div className="bg-[#131921] py-4 text-center text-xs text-gray-400">
        © 2026 e-ticaret.dev — portfolyo projesidir, gerçek satış yapılmaz.
      </div>
    </footer>
  )
}

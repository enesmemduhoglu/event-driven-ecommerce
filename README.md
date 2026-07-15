# Event-Driven E-Ticaret Platformu

[![CI](https://github.com/enesmemduhoglu/event-driven-ecommerce/actions/workflows/ci.yml/badge.svg)](https://github.com/enesmemduhoglu/event-driven-ecommerce/actions/workflows/ci.yml)

.NET 8 üzerinde, mesajlaşma temelli (event-driven) bir e-ticaret backend'i. 9 mikroservis; MassTransit + RabbitMQ ile haberleşir, sipariş yaşam döngüsünü **saga orkestrasyon** yönetir, veri tutarlılığı **transactional outbox** ile sağlanır.

> Mimari detaylar ve tasarım kararları için: [docs/architecture.md](docs/architecture.md)

## Servisler

| Servis | Sorumluluk | Depo | Port |
|---|---|---|---|
| Gateway.Api | Tek giriş noktası, YARP routing, IP bazlı rate limiting, HealthChecks UI | — | 5000 |
| Identity.Api | Kayıt/giriş, RS256 JWT + refresh token rotasyonu, roller, JWKS | identity_db (Postgres) | 5001 |
| Catalog.Api | Ürün/kategori CRUD, fiyat yönetimi, Redis cache, **outbox** ile event yayını | catalog_db (Postgres) | 5002 |
| Search.Api | Tam metin arama/filtreleme; Catalog eventlerini dinleyip indeksler | Elasticsearch | 5003 |
| Basket.Api | Sepet yönetimi (JWT kullanıcısına bağlı, 30 gün TTL) | Redis | 5004 |
| Ordering.Api | Sipariş API'si + **Order Saga state machine** (EF Core'da persist) | ordering_db (Postgres) | 5005 |
| Inventory.Api | Stok rezervasyonu/iadesi, idempotent consumer'lar | inventory_db (Postgres) | 5006 |
| Payment.Api | Mock ödeme (…0002 ile biten kart reddedilir) | payment_db (Postgres) | 5007 |
| Notification.Api | SignalR ile anlık bildirim + e-posta (smtp4dev) | — | 5008 |

## Hızlı Başlangıç

Önkoşullar: Docker Desktop, .NET 8 SDK.

```bash
# 1) Altyapıyı ayağa kaldır (Postgres, Redis, RabbitMQ, Elasticsearch, Seq, smtp4dev, Jaeger, Prometheus, Grafana)
docker compose up -d

# 2a) Servisleri container olarak çalıştır (tam sistem)
docker compose --profile app up -d --build

# 2b) VEYA lokal geliştirme: her servisi ayrı terminalde çalıştır
dotnet run --project src/Services/Identity/Identity.Api --launch-profile http
dotnet run --project src/ApiGateway/Gateway.Api --launch-profile http
# ... (Catalog 5002, Search 5003, Basket 5004, Ordering 5005, Inventory 5006, Payment 5007, Notification 5008)
```

> **Not:** Compose, Postgres'i host'ta **5433** portuna açar (lokal Windows Postgres kurulumlarıyla çakışmamak için). Container içi iletişim 5432 üzerinden yürür.

Tüm uygulama container'larında `/health` endpoint'ine bağlı compose healthcheck tanımlıdır; `docker compose ps` çıktısında her servisin `healthy` durumuna geçmesi beklenir (ilk açılışta migration'lar nedeniyle ~30-60 sn sürebilir).

## Demo Senaryosu

```bash
# Admin ile giriş yap (seed edilir: admin@ecommerce.dev / Admin123!)
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@ecommerce.dev","password":"Admin123!"}'

# Ürün oluştur (ProductCreated eventi → Search indexler + Inventory 100 adet stok açar)
# Sipariş ver (OrderCreated → saga: stok rezervasyonu → ödeme → OrderConfirmed)
# Compensation için kart numarası 4000000000000002 kullan (ödeme reddedilir, stok iade edilir)
```

Hazır istek koleksiyonları `requests/*.http` dosyalarında (VS Code REST Client / Rider ile açın). Uçtan uca otomatik doğrulama için:

```powershell
./scripts/e2e-order-flow.ps1   # happy path + compensation + yetersiz stok senaryoları
```

## Panolar

| Araç | Adres | Ne için |
|---|---|---|
| HealthChecks UI | http://localhost:5000/healthchecks-ui | Tüm servislerin sağlık durumu tek panelde |
| RabbitMQ | http://localhost:15672 (guest/guest) | Kuyruklar, mesaj akışı |
| Seq | http://localhost:8081 | Merkezi structured log (servis adına göre filtrele) |
| Jaeger | http://localhost:16686 | Distributed tracing — bir siparişin servisler arası izini gör |
| Prometheus | http://localhost:9090 | Metrikler |
| Grafana | http://localhost:3001 (admin/admin) | Hazır "E-Commerce Services" dashboard'u |
| smtp4dev | http://localhost:8082 | Gönderilen sipariş e-postaları |
| Kibana yerine | http://localhost:9200 | Elasticsearch'e doğrudan sorgu |

## Testler

```bash
dotnet test                      # 36 test: unit + saga + integration
```

- **Ordering.Saga.Tests** — MassTransit TestHarness ile state machine'in tüm geçişleri (compensation dahil)
- ***.UnitTests** — domain kuralları, JWT üretimi/doğrulaması
- **IntegrationTests** — Testcontainers (`Category=Integration`, Docker gerektirir): gerçek Postgres'te saga persistence, outbox atomikliği, Redis sepet, gerçek RabbitMQ üzerinden mesaj turu

### Smoke test (uçtan uca)

Tek komutla tüm stack'i ayağa kaldırıp sağlık kontrollerini ve sipariş akışı senaryolarını doğrular:

```powershell
./scripts/smoke-test.ps1                  # stack'i başlat, /health bekle, e2e senaryoları çalıştır
./scripts/smoke-test.ps1 -Build           # önce image'ları yeniden build et
./scripts/smoke-test.ps1 -Build -Down     # CI modu: sonunda stack'i volümleriyle indir
```

Script Windows PowerShell 5.1 ve pwsh (Linux/CI) ile çalışır; başarısızlıkta ilgili servisin son 50 log satırını basar ve sıfır dışı exit code döner.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`), her push/PR'da üç aşama çalıştırır:

1. **build-test** — `dotnet build` + `dotnet test` (Testcontainers entegrasyon testleri dahil; runner'daki Docker kullanılır)
2. **smoke** — `smoke-test.ps1 -Build -Down`: tüm stack compose ile ayağa kalkar, sağlık kontrolleri ve uçtan uca sipariş senaryoları koşar
3. **docker-publish** — yalnız `master`'a push'ta: 9 servisin image'ı GHCR'a yayınlanır
   (`ghcr.io/enesmemduhoglu/event-driven-ecommerce/<servis>:latest` ve `:sha-<commit>`)

## Teknolojiler

.NET 8 · MassTransit 8.4 · RabbitMQ · PostgreSQL · Redis · Elasticsearch · YARP · ASP.NET Core Identity (RS256 + JWKS) · SignalR · Serilog + Seq · OpenTelemetry + Jaeger · Prometheus + Grafana · xUnit + Testcontainers

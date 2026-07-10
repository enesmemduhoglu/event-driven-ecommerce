using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Api.Data;

public class StockItem
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public int AvailableQuantity { get; set; }

    /// <summary>Mapped to Postgres' xmin system column — optimistic concurrency token.</summary>
    public uint Version { get; set; }
}

public class StockReservation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class InventoryDbContext : DbContext
{
    public InventoryDbContext(DbContextOptions<InventoryDbContext> options) : base(options)
    {
    }

    public DbSet<StockItem> StockItems => Set<StockItem>();
    public DbSet<StockReservation> StockReservations => Set<StockReservation>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Inbox/outbox tables: duplicate deliveries are deduplicated and the
        // StockReserved/Failed publishes commit atomically with the stock change.
        builder.AddInboxStateEntity();
        builder.AddOutboxMessageEntity();
        builder.AddOutboxStateEntity();

        builder.Entity<StockItem>(entity =>
        {
            entity.HasKey(s => s.ProductId);
            entity.Property(s => s.ProductName).HasMaxLength(200).IsRequired();
            // Optimistic concurrency on Postgres' xmin system column: concurrent
            // reservations of the same product conflict and get retried.
            entity.Property(s => s.Version).IsRowVersion();
        });

        builder.Entity<StockReservation>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => r.OrderId);
        });
    }
}

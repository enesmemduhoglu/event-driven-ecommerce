using MassTransit;
using MassTransit.EntityFrameworkCoreIntegration;
using Microsoft.EntityFrameworkCore;
using Ordering.Domain.Entities;
using Ordering.Infrastructure.Data.Configurations;

namespace Ordering.Infrastructure.Data;

/// <summary>
/// Single ordering_db context: business entities (Order/OrderItem), the persisted
/// saga state (OrderState) and the MassTransit outbox/inbox tables.
/// </summary>
public class OrderingDbContext : SagaDbContext
{
    public OrderingDbContext(DbContextOptions<OrderingDbContext> options) : base(options)
    {
    }

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override IEnumerable<ISagaClassMap> Configurations
    {
        get { yield return new OrderStateMap(); }
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.AddInboxStateEntity();
        builder.AddOutboxMessageEntity();
        builder.AddOutboxStateEntity();

        builder.Entity<Order>(entity =>
        {
            entity.Property(o => o.UserId).HasMaxLength(450).IsRequired();
            entity.Property(o => o.UserEmail).HasMaxLength(256).IsRequired();
            entity.Property(o => o.ShippingAddress).HasMaxLength(1000).IsRequired();
            entity.Property(o => o.TotalAmount).HasPrecision(18, 2);
            entity.Property(o => o.CancellationReason).HasMaxLength(500);
            entity.HasMany(o => o.Items)
                .WithOne()
                .HasForeignKey(i => i.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(o => o.UserId);
        });

        builder.Entity<OrderItem>(entity =>
        {
            entity.Property(i => i.ProductName).HasMaxLength(200).IsRequired();
            entity.Property(i => i.UnitPrice).HasPrecision(18, 2);
        });
    }
}

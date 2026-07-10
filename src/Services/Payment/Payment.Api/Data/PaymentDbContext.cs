using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Payment.Api.Data;

public class PaymentRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public string UserId { get; set; } = default!;
    public decimal Amount { get; set; }
    public string CardLast4 { get; set; } = default!;
    public bool Succeeded { get; set; }
    public string? FailureReason { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class PaymentDbContext : DbContext
{
    public PaymentDbContext(DbContextOptions<PaymentDbContext> options) : base(options)
    {
    }

    public DbSet<PaymentRecord> Payments => Set<PaymentRecord>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.AddInboxStateEntity();
        builder.AddOutboxMessageEntity();
        builder.AddOutboxStateEntity();

        builder.Entity<PaymentRecord>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.UserId).HasMaxLength(450).IsRequired();
            entity.Property(p => p.Amount).HasPrecision(18, 2);
            entity.Property(p => p.CardLast4).HasMaxLength(4).IsRequired();
            entity.Property(p => p.FailureReason).HasMaxLength(500);
            // One payment attempt per order — also guards idempotency at the DB level.
            entity.HasIndex(p => p.OrderId).IsUnique();
        });
    }
}

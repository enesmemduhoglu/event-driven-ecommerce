using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Ordering.Saga;

namespace Ordering.Infrastructure.Data.Configurations;

public class OrderStateMap : SagaClassMap<OrderState>
{
    protected override void Configure(EntityTypeBuilder<OrderState> entity, ModelBuilder model)
    {
        entity.ToTable("OrderStates");
        entity.Property(x => x.CurrentState).HasMaxLength(64).IsRequired();
        entity.Property(x => x.UserId).HasMaxLength(450).IsRequired();
        entity.Property(x => x.UserEmail).HasMaxLength(256).IsRequired();
        entity.Property(x => x.CardNumber).HasMaxLength(32).IsRequired();
        entity.Property(x => x.TotalAmount).HasPrecision(18, 2);
        entity.Property(x => x.FailureReason).HasMaxLength(500);
    }
}

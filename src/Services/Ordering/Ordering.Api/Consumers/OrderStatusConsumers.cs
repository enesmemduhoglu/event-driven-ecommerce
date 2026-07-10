using EventBus.Contracts.Ordering;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Ordering.Infrastructure.Data;

namespace Ordering.Api.Consumers;

// The saga owns the workflow; these consumers project its outcome
// (OrderConfirmed / OrderCancelled) back onto the Orders table.

public class OrderConfirmedConsumer : IConsumer<OrderConfirmed>
{
    private readonly OrderingDbContext _dbContext;
    private readonly ILogger<OrderConfirmedConsumer> _logger;

    public OrderConfirmedConsumer(OrderingDbContext dbContext, ILogger<OrderConfirmedConsumer> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderConfirmed> context)
    {
        var order = await _dbContext.Orders.SingleOrDefaultAsync(o => o.Id == context.Message.OrderId);
        if (order is null)
        {
            _logger.LogWarning("OrderConfirmed received for unknown order {OrderId}", context.Message.OrderId);
            return;
        }

        order.Confirm();
        await _dbContext.SaveChangesAsync();
        _logger.LogInformation("Order {OrderId} confirmed", order.Id);
    }
}

public class OrderCancelledConsumer : IConsumer<OrderCancelled>
{
    private readonly OrderingDbContext _dbContext;
    private readonly ILogger<OrderCancelledConsumer> _logger;

    public OrderCancelledConsumer(OrderingDbContext dbContext, ILogger<OrderCancelledConsumer> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderCancelled> context)
    {
        var order = await _dbContext.Orders.SingleOrDefaultAsync(o => o.Id == context.Message.OrderId);
        if (order is null)
        {
            _logger.LogWarning("OrderCancelled received for unknown order {OrderId}", context.Message.OrderId);
            return;
        }

        order.Cancel(context.Message.Reason);
        await _dbContext.SaveChangesAsync();
        _logger.LogInformation("Order {OrderId} cancelled: {Reason}", order.Id, context.Message.Reason);
    }
}

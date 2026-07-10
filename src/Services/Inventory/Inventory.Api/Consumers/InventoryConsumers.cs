using EventBus.Contracts.Catalog;
using EventBus.Contracts.Ordering;
using Inventory.Api.Data;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Api.Consumers;

/// <summary>New catalog products automatically get a stock record with a default quantity.</summary>
public class ProductCreatedConsumer : IConsumer<ProductCreated>
{
    public const int DefaultInitialQuantity = 100;

    private readonly InventoryDbContext _dbContext;

    public ProductCreatedConsumer(InventoryDbContext dbContext) => _dbContext = dbContext;

    public async Task Consume(ConsumeContext<ProductCreated> context)
    {
        var m = context.Message;
        if (await _dbContext.StockItems.AnyAsync(s => s.ProductId == m.ProductId))
        {
            return;
        }

        _dbContext.StockItems.Add(new StockItem
        {
            ProductId = m.ProductId,
            ProductName = m.Name,
            AvailableQuantity = DefaultInitialQuantity
        });

        await _dbContext.SaveChangesAsync();
    }
}

public class OrderCreatedConsumer : IConsumer<OrderCreated>
{
    private readonly InventoryDbContext _dbContext;
    private readonly ILogger<OrderCreatedConsumer> _logger;

    public OrderCreatedConsumer(InventoryDbContext dbContext, ILogger<OrderCreatedConsumer> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderCreated> context)
    {
        var m = context.Message;

        // Defensive idempotency on top of the inbox: an order is only reserved once.
        if (await _dbContext.StockReservations.AnyAsync(r => r.OrderId == m.OrderId))
        {
            _logger.LogInformation("Order {OrderId} already has reservations, skipping", m.OrderId);
            return;
        }

        var productIds = m.Items.Select(i => i.ProductId).ToList();
        var stocks = await _dbContext.StockItems
            .Where(s => productIds.Contains(s.ProductId))
            .ToDictionaryAsync(s => s.ProductId);

        var insufficient = m.Items
            .Where(i => !stocks.TryGetValue(i.ProductId, out var stock) || stock.AvailableQuantity < i.Quantity)
            .Select(i => i.ProductName)
            .ToList();

        if (insufficient.Count > 0)
        {
            await context.Publish(new StockReservationFailed(
                m.OrderId, $"Insufficient stock for: {string.Join(", ", insufficient)}"));
            _logger.LogInformation("Stock reservation failed for order {OrderId}", m.OrderId);
        }
        else
        {
            foreach (var item in m.Items)
            {
                stocks[item.ProductId].AvailableQuantity -= item.Quantity;
                _dbContext.StockReservations.Add(new StockReservation
                {
                    OrderId = m.OrderId,
                    ProductId = item.ProductId,
                    Quantity = item.Quantity
                });
            }

            await context.Publish(new StockReserved(m.OrderId));
            _logger.LogInformation("Reserved stock for order {OrderId}", m.OrderId);
        }

        await _dbContext.SaveChangesAsync();
    }
}

/// <summary>Compensation: returns reserved stock when the saga cancels an order after payment failure.</summary>
public class StockReleaseRequestedConsumer : IConsumer<StockReleaseRequested>
{
    private readonly InventoryDbContext _dbContext;
    private readonly ILogger<StockReleaseRequestedConsumer> _logger;

    public StockReleaseRequestedConsumer(InventoryDbContext dbContext, ILogger<StockReleaseRequestedConsumer> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<StockReleaseRequested> context)
    {
        var orderId = context.Message.OrderId;
        var reservations = await _dbContext.StockReservations
            .Where(r => r.OrderId == orderId)
            .ToListAsync();

        if (reservations.Count == 0)
        {
            _logger.LogWarning("No reservations found to release for order {OrderId}", orderId);
            return;
        }

        var productIds = reservations.Select(r => r.ProductId).ToList();
        var stocks = await _dbContext.StockItems
            .Where(s => productIds.Contains(s.ProductId))
            .ToDictionaryAsync(s => s.ProductId);

        foreach (var reservation in reservations)
        {
            if (stocks.TryGetValue(reservation.ProductId, out var stock))
            {
                stock.AvailableQuantity += reservation.Quantity;
            }
        }

        _dbContext.StockReservations.RemoveRange(reservations);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Released stock for order {OrderId} ({Count} reservations)", orderId, reservations.Count);
    }
}

using Basket.Api.Services;
using EventBus.Contracts.Ordering;
using MassTransit;

namespace Basket.Api.Consumers;

/// <summary>Once an order is placed, the user's basket has served its purpose — clear it.</summary>
public class OrderCreatedConsumer : IConsumer<OrderCreated>
{
    private readonly IBasketRepository _repository;
    private readonly ILogger<OrderCreatedConsumer> _logger;

    public OrderCreatedConsumer(IBasketRepository repository, ILogger<OrderCreatedConsumer> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderCreated> context)
    {
        await _repository.DeleteAsync(context.Message.UserId);
        _logger.LogInformation("Cleared basket of user {UserId} after order {OrderId}",
            context.Message.UserId, context.Message.OrderId);
    }
}

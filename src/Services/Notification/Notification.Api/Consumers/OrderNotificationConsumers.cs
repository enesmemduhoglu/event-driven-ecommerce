using EventBus.Contracts.Ordering;
using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Notification.Api.Hubs;
using Notification.Api.Services;

namespace Notification.Api.Consumers;

public class OrderConfirmedConsumer : IConsumer<OrderConfirmed>
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly EmailSender _emailSender;
    private readonly ILogger<OrderConfirmedConsumer> _logger;

    public OrderConfirmedConsumer(IHubContext<NotificationHub> hubContext, EmailSender emailSender, ILogger<OrderConfirmedConsumer> logger)
    {
        _hubContext = hubContext;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderConfirmed> context)
    {
        var m = context.Message;

        await _hubContext.Clients.User(m.UserId).SendAsync("orderStatusChanged", new
        {
            orderId = m.OrderId,
            status = "Confirmed",
            totalAmount = m.TotalAmount
        });

        await _emailSender.SendAsync(
            m.UserEmail,
            $"Order {m.OrderId} confirmed",
            $"Good news! Your order {m.OrderId} ({m.TotalAmount:C}) has been confirmed and will ship soon.");

        _logger.LogInformation("Notified user {UserId} about confirmed order {OrderId}", m.UserId, m.OrderId);
    }
}

public class OrderCancelledConsumer : IConsumer<OrderCancelled>
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly EmailSender _emailSender;
    private readonly ILogger<OrderCancelledConsumer> _logger;

    public OrderCancelledConsumer(IHubContext<NotificationHub> hubContext, EmailSender emailSender, ILogger<OrderCancelledConsumer> logger)
    {
        _hubContext = hubContext;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderCancelled> context)
    {
        var m = context.Message;

        await _hubContext.Clients.User(m.UserId).SendAsync("orderStatusChanged", new
        {
            orderId = m.OrderId,
            status = "Cancelled",
            reason = m.Reason
        });

        await _emailSender.SendAsync(
            m.UserEmail,
            $"Order {m.OrderId} cancelled",
            $"Unfortunately your order {m.OrderId} was cancelled. Reason: {m.Reason}");

        _logger.LogInformation("Notified user {UserId} about cancelled order {OrderId}", m.UserId, m.OrderId);
    }
}

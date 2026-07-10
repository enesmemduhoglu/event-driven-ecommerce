using EventBus.Contracts.Ordering;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Payment.Api.Data;

namespace Payment.Api.Consumers;

/// <summary>
/// Mock payment processor: card numbers ending in "0002" are declined,
/// everything else succeeds. This makes the saga's compensation path demoable.
/// </summary>
public class PaymentRequestedConsumer : IConsumer<PaymentRequested>
{
    public const string DecliningCardSuffix = "0002";

    private readonly PaymentDbContext _dbContext;
    private readonly ILogger<PaymentRequestedConsumer> _logger;

    public PaymentRequestedConsumer(PaymentDbContext dbContext, ILogger<PaymentRequestedConsumer> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentRequested> context)
    {
        var m = context.Message;

        var existing = await _dbContext.Payments.AsNoTracking().SingleOrDefaultAsync(p => p.OrderId == m.OrderId);
        if (existing is not null)
        {
            // Duplicate delivery: re-publish the original outcome instead of charging twice.
            await PublishOutcome(context, existing);
            return;
        }

        await Task.Delay(300); // simulate provider latency

        var cardNumber = m.CardNumber.Replace(" ", "");
        var payment = new PaymentRecord
        {
            OrderId = m.OrderId,
            UserId = m.UserId,
            Amount = m.Amount,
            CardLast4 = cardNumber[^4..],
            Succeeded = !cardNumber.EndsWith(DecliningCardSuffix),
            FailureReason = cardNumber.EndsWith(DecliningCardSuffix) ? "Card declined by issuer" : null
        };

        _dbContext.Payments.Add(payment);
        await PublishOutcome(context, payment);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Payment for order {OrderId}: {Outcome}",
            m.OrderId, payment.Succeeded ? "processed" : $"failed ({payment.FailureReason})");
    }

    private static async Task PublishOutcome(ConsumeContext context, PaymentRecord payment)
    {
        if (payment.Succeeded)
        {
            await context.Publish(new PaymentProcessed(payment.OrderId, payment.Id));
        }
        else
        {
            await context.Publish(new PaymentFailed(payment.OrderId, payment.FailureReason!));
        }
    }
}

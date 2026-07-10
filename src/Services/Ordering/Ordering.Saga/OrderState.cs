using MassTransit;

namespace Ordering.Saga;

/// <summary>
/// Persisted saga instance (EF Core repository in ordering_db) so in-flight orders
/// survive service restarts. CorrelationId == OrderId.
/// </summary>
public class OrderState : SagaStateMachineInstance
{
    public Guid CorrelationId { get; set; }
    public string CurrentState { get; set; } = default!;

    public string UserId { get; set; } = default!;
    public string UserEmail { get; set; } = default!;
    public decimal TotalAmount { get; set; }

    /// <summary>Mock payment data carried to the PaymentRequested message; a real system would store a payment token.</summary>
    public string CardNumber { get; set; } = default!;

    public DateTime OrderCreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public string? FailureReason { get; set; }
}

using EventBus.Contracts.Ordering;
using MassTransit;

namespace Ordering.Saga;

/// <summary>
/// Orchestrates the order lifecycle:
///
///   OrderCreated → AwaitingStockReservation
///     ├─ StockReserved            → publish PaymentRequested → AwaitingPayment
///     │    ├─ PaymentProcessed    → publish OrderConfirmed   → Confirmed (final)
///     │    └─ PaymentFailed       → publish StockReleaseRequested (compensation)
///     │                             + OrderCancelled          → Cancelled (final)
///     └─ StockReservationFailed   → publish OrderCancelled    → Cancelled (final)
/// </summary>
public class OrderStateMachine : MassTransitStateMachine<OrderState>
{
    public State AwaitingStockReservation { get; private set; } = default!;
    public State AwaitingPayment { get; private set; } = default!;
    public State Confirmed { get; private set; } = default!;
    public State Cancelled { get; private set; } = default!;

    public Event<OrderCreated> OrderCreated { get; private set; } = default!;
    public Event<StockReserved> StockReserved { get; private set; } = default!;
    public Event<StockReservationFailed> StockReservationFailed { get; private set; } = default!;
    public Event<PaymentProcessed> PaymentProcessed { get; private set; } = default!;
    public Event<PaymentFailed> PaymentFailed { get; private set; } = default!;

    public OrderStateMachine()
    {
        InstanceState(x => x.CurrentState);

        Event(() => OrderCreated, x => x.CorrelateById(m => m.Message.OrderId));
        Event(() => StockReserved, x => x.CorrelateById(m => m.Message.OrderId));
        Event(() => StockReservationFailed, x => x.CorrelateById(m => m.Message.OrderId));
        Event(() => PaymentProcessed, x => x.CorrelateById(m => m.Message.OrderId));
        Event(() => PaymentFailed, x => x.CorrelateById(m => m.Message.OrderId));

        Initially(
            When(OrderCreated)
                .Then(context =>
                {
                    context.Saga.UserId = context.Message.UserId;
                    context.Saga.UserEmail = context.Message.UserEmail;
                    context.Saga.TotalAmount = context.Message.TotalAmount;
                    context.Saga.CardNumber = context.Message.CardNumber;
                    context.Saga.OrderCreatedAtUtc = context.Message.OccurredAtUtc;
                    context.Saga.UpdatedAtUtc = DateTime.UtcNow;
                })
                .TransitionTo(AwaitingStockReservation));

        During(AwaitingStockReservation,
            When(StockReserved)
                .Then(context => context.Saga.UpdatedAtUtc = DateTime.UtcNow)
                .Publish(context => new PaymentRequested(
                    context.Saga.CorrelationId,
                    context.Saga.UserId,
                    context.Saga.TotalAmount,
                    context.Saga.CardNumber))
                .TransitionTo(AwaitingPayment),
            When(StockReservationFailed)
                .Then(context =>
                {
                    context.Saga.FailureReason = context.Message.Reason;
                    context.Saga.UpdatedAtUtc = DateTime.UtcNow;
                })
                .Publish(context => new OrderCancelled(
                    context.Saga.CorrelationId,
                    context.Saga.UserId,
                    context.Saga.UserEmail,
                    context.Message.Reason))
                .TransitionTo(Cancelled));

        During(AwaitingPayment,
            When(PaymentProcessed)
                .Then(context => context.Saga.UpdatedAtUtc = DateTime.UtcNow)
                .Publish(context => new OrderConfirmed(
                    context.Saga.CorrelationId,
                    context.Saga.UserId,
                    context.Saga.UserEmail,
                    context.Saga.TotalAmount))
                .TransitionTo(Confirmed),
            When(PaymentFailed)
                .Then(context =>
                {
                    context.Saga.FailureReason = context.Message.Reason;
                    context.Saga.UpdatedAtUtc = DateTime.UtcNow;
                })
                // Compensating action: stock was already reserved, give it back.
                .Publish(context => new StockReleaseRequested(context.Saga.CorrelationId))
                .Publish(context => new OrderCancelled(
                    context.Saga.CorrelationId,
                    context.Saga.UserId,
                    context.Saga.UserEmail,
                    context.Message.Reason))
                .TransitionTo(Cancelled));

        // Duplicate / late events in final states are ignored rather than faulted.
        During(Confirmed, Ignore(PaymentProcessed), Ignore(StockReserved));
        During(Cancelled, Ignore(StockReservationFailed), Ignore(PaymentFailed), Ignore(StockReserved));
    }
}

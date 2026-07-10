using EventBus.Contracts.Ordering;
using FluentAssertions;
using MassTransit;
using MassTransit.Testing;
using Microsoft.Extensions.DependencyInjection;
using Ordering.Saga;
using Xunit;

namespace Ordering.Saga.Tests;

public class OrderStateMachineTests : IAsyncLifetime
{
    private ServiceProvider _provider = default!;
    private ITestHarness _harness = default!;
    private ISagaStateMachineTestHarness<OrderStateMachine, OrderState> _sagaHarness = default!;

    public async Task InitializeAsync()
    {
        _provider = new ServiceCollection()
            .AddMassTransitTestHarness(x => x.AddSagaStateMachine<OrderStateMachine, OrderState>())
            .BuildServiceProvider(validateScopes: true);

        _harness = _provider.GetRequiredService<ITestHarness>();
        await _harness.Start();
        _sagaHarness = _harness.GetSagaStateMachineHarness<OrderStateMachine, OrderState>();
    }

    public async Task DisposeAsync() => await _provider.DisposeAsync();

    private static OrderCreated NewOrderCreated(Guid orderId, string cardNumber = "4111111111111111") => new(
        orderId,
        "user-1",
        "user@test.dev",
        219.98m,
        cardNumber,
        [new OrderItem(Guid.NewGuid(), "Test Product", 109.99m, 2)],
        DateTime.UtcNow);

    private async Task<OrderState> DriveToAwaitingStockReservation(Guid orderId)
    {
        await _harness.Bus.Publish(NewOrderCreated(orderId));
        (await _sagaHarness.Consumed.Any<OrderCreated>(x => x.Context.Message.OrderId == orderId)).Should().BeTrue();

        var instance = _sagaHarness.Created.ContainsInState(
            orderId, _sagaHarness.StateMachine, _sagaHarness.StateMachine.AwaitingStockReservation);
        instance.Should().NotBeNull();
        return instance!;
    }

    [Fact]
    public async Task OrderCreated_starts_saga_in_AwaitingStockReservation_and_copies_order_data()
    {
        var orderId = NewId.NextGuid();

        var instance = await DriveToAwaitingStockReservation(orderId);

        instance.UserId.Should().Be("user-1");
        instance.UserEmail.Should().Be("user@test.dev");
        instance.TotalAmount.Should().Be(219.98m);
        instance.CardNumber.Should().Be("4111111111111111");
    }

    [Fact]
    public async Task StockReserved_requests_payment_and_moves_to_AwaitingPayment()
    {
        var orderId = NewId.NextGuid();
        await DriveToAwaitingStockReservation(orderId);

        await _harness.Bus.Publish(new StockReserved(orderId));

        (await _harness.Published.Any<PaymentRequested>(x =>
            x.Context.Message.OrderId == orderId &&
            x.Context.Message.Amount == 219.98m &&
            x.Context.Message.CardNumber == "4111111111111111")).Should().BeTrue();

        _sagaHarness.Created.ContainsInState(
                orderId, _sagaHarness.StateMachine, _sagaHarness.StateMachine.AwaitingPayment)
            .Should().NotBeNull();
    }

    [Fact]
    public async Task PaymentProcessed_confirms_the_order()
    {
        var orderId = NewId.NextGuid();
        await DriveToAwaitingStockReservation(orderId);
        await _harness.Bus.Publish(new StockReserved(orderId));
        (await _harness.Published.Any<PaymentRequested>(x => x.Context.Message.OrderId == orderId)).Should().BeTrue();

        await _harness.Bus.Publish(new PaymentProcessed(orderId, NewId.NextGuid()));

        (await _harness.Published.Any<OrderConfirmed>(x =>
            x.Context.Message.OrderId == orderId &&
            x.Context.Message.TotalAmount == 219.98m)).Should().BeTrue();

        _sagaHarness.Created.ContainsInState(
                orderId, _sagaHarness.StateMachine, _sagaHarness.StateMachine.Confirmed)
            .Should().NotBeNull();
    }

    [Fact]
    public async Task PaymentFailed_releases_stock_and_cancels_the_order()
    {
        var orderId = NewId.NextGuid();
        await DriveToAwaitingStockReservation(orderId);
        await _harness.Bus.Publish(new StockReserved(orderId));
        (await _harness.Published.Any<PaymentRequested>(x => x.Context.Message.OrderId == orderId)).Should().BeTrue();

        await _harness.Bus.Publish(new PaymentFailed(orderId, "Card declined by issuer"));

        // Compensation: reserved stock must be given back.
        (await _harness.Published.Any<StockReleaseRequested>(x => x.Context.Message.OrderId == orderId))
            .Should().BeTrue();
        (await _harness.Published.Any<OrderCancelled>(x =>
            x.Context.Message.OrderId == orderId &&
            x.Context.Message.Reason == "Card declined by issuer")).Should().BeTrue();

        var instance = _sagaHarness.Created.ContainsInState(
            orderId, _sagaHarness.StateMachine, _sagaHarness.StateMachine.Cancelled);
        instance.Should().NotBeNull();
        instance!.FailureReason.Should().Be("Card declined by issuer");
    }

    [Fact]
    public async Task StockReservationFailed_cancels_the_order_without_touching_payment()
    {
        var orderId = NewId.NextGuid();
        await DriveToAwaitingStockReservation(orderId);

        await _harness.Bus.Publish(new StockReservationFailed(orderId, "Insufficient stock for: Test Product"));

        (await _harness.Published.Any<OrderCancelled>(x =>
            x.Context.Message.OrderId == orderId &&
            x.Context.Message.Reason.Contains("Insufficient stock"))).Should().BeTrue();

        (await _harness.Published.Any<PaymentRequested>(x => x.Context.Message.OrderId == orderId))
            .Should().BeFalse("payment must never be requested when stock reservation failed");
        (await _harness.Published.Any<StockReleaseRequested>(x => x.Context.Message.OrderId == orderId))
            .Should().BeFalse("nothing was reserved, so nothing should be released");

        _sagaHarness.Created.ContainsInState(
                orderId, _sagaHarness.StateMachine, _sagaHarness.StateMachine.Cancelled)
            .Should().NotBeNull();
    }
}

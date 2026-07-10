using BuildingBlocks.Common.Exceptions;
using FluentAssertions;
using Ordering.Domain.Entities;
using Xunit;

namespace Ordering.UnitTests;

public class OrderTests
{
    private static Order NewOrder() => new(
        "user-1",
        "user@test.dev",
        "Ataturk Cad. No:1 Istanbul",
        [
            new OrderItem(Guid.NewGuid(), "Mouse", 109.99m, 2),
            new OrderItem(Guid.NewGuid(), "Keyboard", 250.00m, 1)
        ]);

    [Fact]
    public void Total_amount_is_computed_from_items()
    {
        var order = NewOrder();

        order.TotalAmount.Should().Be(2 * 109.99m + 250.00m);
        order.Status.Should().Be(OrderStatus.Pending);
    }

    [Fact]
    public void An_order_without_items_is_rejected()
    {
        var act = () => new Order("user-1", "user@test.dev", "address", []);

        act.Should().Throw<DomainException>().WithMessage("*at least one item*");
    }

    [Fact]
    public void Confirm_moves_a_pending_order_to_confirmed()
    {
        var order = NewOrder();

        order.Confirm();

        order.Status.Should().Be(OrderStatus.Confirmed);
    }

    [Fact]
    public void Confirm_is_rejected_when_the_order_is_not_pending()
    {
        var order = NewOrder();
        order.Confirm();

        var act = () => order.Confirm();

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void Cancel_records_the_reason()
    {
        var order = NewOrder();

        order.Cancel("Card declined by issuer");

        order.Status.Should().Be(OrderStatus.Cancelled);
        order.CancellationReason.Should().Be("Card declined by issuer");
    }

    [Fact]
    public void Cancel_is_rejected_after_confirmation()
    {
        var order = NewOrder();
        order.Confirm();

        var act = () => order.Cancel("too late");

        act.Should().Throw<DomainException>();
    }

    [Theory]
    [InlineData(0, 10)]
    [InlineData(-1, 10)]
    public void Order_items_with_non_positive_quantity_are_rejected(int quantity, double price)
    {
        var act = () => new OrderItem(Guid.NewGuid(), "X", (decimal)price, quantity);

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void Order_items_with_non_positive_price_are_rejected()
    {
        var act = () => new OrderItem(Guid.NewGuid(), "X", 0m, 1);

        act.Should().Throw<DomainException>();
    }
}

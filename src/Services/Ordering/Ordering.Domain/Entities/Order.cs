using BuildingBlocks.Common.Domain;
using BuildingBlocks.Common.Exceptions;

namespace Ordering.Domain.Entities;

public enum OrderStatus
{
    /// <summary>Created; the saga is coordinating stock reservation and payment.</summary>
    Pending = 0,
    Confirmed = 1,
    Cancelled = 2
}

public class Order : BaseEntity
{
    public string UserId { get; private set; } = default!;
    public string UserEmail { get; private set; } = default!;
    public string ShippingAddress { get; private set; } = default!;
    public decimal TotalAmount { get; private set; }
    public OrderStatus Status { get; private set; }
    public string? CancellationReason { get; private set; }

    private readonly List<OrderItem> _items = [];
    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();

    private Order()
    {
        // EF Core
    }

    public Order(string userId, string userEmail, string shippingAddress, IReadOnlyCollection<OrderItem> items)
    {
        if (items.Count == 0)
        {
            throw new DomainException("An order must contain at least one item.");
        }

        UserId = userId;
        UserEmail = userEmail;
        ShippingAddress = shippingAddress;
        Status = OrderStatus.Pending;
        _items.AddRange(items);
        TotalAmount = items.Sum(i => i.UnitPrice * i.Quantity);
    }

    public void Confirm()
    {
        if (Status != OrderStatus.Pending)
        {
            throw new DomainException($"Only pending orders can be confirmed (current: {Status}).");
        }

        Status = OrderStatus.Confirmed;
        MarkUpdated();
    }

    public void Cancel(string reason)
    {
        if (Status != OrderStatus.Pending)
        {
            throw new DomainException($"Only pending orders can be cancelled (current: {Status}).");
        }

        Status = OrderStatus.Cancelled;
        CancellationReason = reason;
        MarkUpdated();
    }
}

public class OrderItem : BaseEntity
{
    public Guid OrderId { get; private set; }
    public Guid ProductId { get; private set; }
    public string ProductName { get; private set; } = default!;
    public decimal UnitPrice { get; private set; }
    public int Quantity { get; private set; }

    private OrderItem()
    {
        // EF Core
    }

    public OrderItem(Guid productId, string productName, decimal unitPrice, int quantity)
    {
        if (quantity <= 0)
        {
            throw new DomainException("Order item quantity must be positive.");
        }

        if (unitPrice <= 0)
        {
            throw new DomainException("Order item unit price must be positive.");
        }

        ProductId = productId;
        ProductName = productName;
        UnitPrice = unitPrice;
        Quantity = quantity;
    }
}

namespace EventBus.Contracts.Ordering;

public record OrderItem(
    Guid ProductId,
    string ProductName,
    decimal UnitPrice,
    int Quantity);

/// <summary>
/// Published by Ordering when an order is accepted. Starts the order saga;
/// also consumed by Inventory (stock reservation) and Basket (clears the user's basket).
/// CardNumber is carried only because payment is mocked — a real system would use a
/// tokenized payment reference instead of raw card data on the bus.
/// </summary>
public record OrderCreated(
    Guid OrderId,
    string UserId,
    string UserEmail,
    decimal TotalAmount,
    string CardNumber,
    IReadOnlyList<OrderItem> Items,
    DateTime OccurredAtUtc);

public record StockReserved(Guid OrderId);

public record StockReservationFailed(Guid OrderId, string Reason);

/// <summary>Compensation: published by the saga when payment fails after stock was reserved.</summary>
public record StockReleaseRequested(Guid OrderId);

/// <summary>Published by the saga once stock is reserved; consumed by Payment.</summary>
public record PaymentRequested(
    Guid OrderId,
    string UserId,
    decimal Amount,
    string CardNumber);

public record PaymentProcessed(Guid OrderId, Guid PaymentId);

public record PaymentFailed(Guid OrderId, string Reason);

public record OrderConfirmed(
    Guid OrderId,
    string UserId,
    string UserEmail,
    decimal TotalAmount);

public record OrderCancelled(
    Guid OrderId,
    string UserId,
    string UserEmail,
    string Reason);

/// <summary>Published by Ordering when an admin marks a confirmed order as shipped.</summary>
public record OrderShipped(
    Guid OrderId,
    string UserId,
    string UserEmail);

/// <summary>Published by Ordering when an admin marks a shipped order as delivered.</summary>
public record OrderDelivered(
    Guid OrderId,
    string UserId,
    string UserEmail);

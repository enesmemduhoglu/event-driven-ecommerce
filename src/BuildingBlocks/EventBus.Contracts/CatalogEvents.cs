namespace EventBus.Contracts.Catalog;

public record ProductCreated(
    Guid ProductId,
    string Name,
    string Description,
    decimal Price,
    Guid CategoryId,
    string CategoryName,
    DateTime OccurredAtUtc);

public record ProductUpdated(
    Guid ProductId,
    string Name,
    string Description,
    decimal Price,
    Guid CategoryId,
    string CategoryName,
    DateTime OccurredAtUtc);

public record ProductPriceChanged(
    Guid ProductId,
    decimal OldPrice,
    decimal NewPrice,
    DateTime OccurredAtUtc);

public record ProductDeleted(
    Guid ProductId,
    DateTime OccurredAtUtc);

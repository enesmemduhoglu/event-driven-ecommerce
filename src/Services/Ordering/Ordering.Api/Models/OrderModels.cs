using System.ComponentModel.DataAnnotations;
using Ordering.Domain.Entities;

namespace Ordering.Api.Models;

public record OrderItemRequest(
    [Required] Guid ProductId,
    [Required, MaxLength(200)] string ProductName,
    [Range(0.01, double.MaxValue)] decimal UnitPrice,
    [Range(1, 1000)] int Quantity);

public record CreateOrderRequest(
    [Required, MinLength(1)] List<OrderItemRequest> Items,
    [Required, MaxLength(1000)] string ShippingAddress,
    // Mock payment: any card number is accepted, numbers ending in "0002" are declined.
    [Required, CreditCardish] string CardNumber);

public record OrderItemDto(Guid ProductId, string ProductName, decimal UnitPrice, int Quantity);

public record OrderDto(
    Guid Id,
    string UserId,
    string Status,
    decimal TotalAmount,
    string ShippingAddress,
    string? CancellationReason,
    DateTime CreatedAtUtc,
    IReadOnlyList<OrderItemDto> Items)
{
    public static OrderDto From(Order order) => new(
        order.Id,
        order.UserId,
        order.Status.ToString(),
        order.TotalAmount,
        order.ShippingAddress,
        order.CancellationReason,
        order.CreatedAtUtc,
        order.Items.Select(i => new OrderItemDto(i.ProductId, i.ProductName, i.UnitPrice, i.Quantity)).ToList());
}

/// <summary>Loose card format check — this is a mock payment flow, not real PAN validation.</summary>
public class CreditCardishAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
        => value is string s && s.Replace(" ", "").Length is >= 12 and <= 19 && s.Replace(" ", "").All(char.IsDigit);

    public override string FormatErrorMessage(string name)
        => $"{name} must be 12-19 digits.";
}

using System.ComponentModel.DataAnnotations;

namespace Basket.Api.Models;

public class CustomerBasket
{
    public string UserId { get; set; } = default!;
    public List<BasketItem> Items { get; set; } = [];

    public decimal TotalAmount => Items.Sum(i => i.UnitPrice * i.Quantity);
}

public class BasketItem
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
}

// The client supplies a product snapshot (name/price). A production system would
// validate these against Catalog; kept client-provided here for simplicity.
public record AddItemRequest(
    [Required] Guid ProductId,
    [Required, MaxLength(200)] string ProductName,
    [Range(0.01, double.MaxValue)] decimal UnitPrice,
    [Range(1, 1000)] int Quantity);

public record UpdateQuantityRequest([Range(1, 1000)] int Quantity);

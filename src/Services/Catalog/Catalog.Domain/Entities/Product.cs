using BuildingBlocks.Common.Domain;
using BuildingBlocks.Common.Exceptions;

namespace Catalog.Domain.Entities;

public class Product : BaseEntity
{
    public string Name { get; private set; } = default!;
    public string Description { get; private set; } = default!;
    public decimal Price { get; private set; }
    public Guid CategoryId { get; private set; }
    public Category Category { get; private set; } = default!;

    private Product()
    {
        // EF Core
    }

    public Product(string name, string description, decimal price, Guid categoryId)
    {
        SetName(name);
        Description = description;
        SetPrice(price);
        CategoryId = categoryId;
    }

    public void UpdateDetails(string name, string description, Guid categoryId)
    {
        SetName(name);
        Description = description;
        CategoryId = categoryId;
        MarkUpdated();
    }

    /// <summary>Changes the price and returns the previous one (carried on the ProductPriceChanged event).</summary>
    public decimal ChangePrice(decimal newPrice)
    {
        if (newPrice == Price)
        {
            throw new DomainException("New price must differ from the current price.");
        }

        var oldPrice = Price;
        SetPrice(newPrice);
        MarkUpdated();
        return oldPrice;
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainException("Product name cannot be empty.");
        }

        Name = name.Trim();
    }

    private void SetPrice(decimal price)
    {
        if (price <= 0)
        {
            throw new DomainException("Product price must be greater than zero.");
        }

        Price = price;
    }
}

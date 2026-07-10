using BuildingBlocks.Common.Exceptions;
using Catalog.Domain.Entities;
using FluentAssertions;
using Xunit;

namespace Catalog.UnitTests;

public class ProductTests
{
    private static Product NewProduct(decimal price = 100m)
        => new("Keyboard", "Mechanical keyboard", price, Guid.NewGuid());

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Creating_a_product_with_non_positive_price_is_rejected(decimal price)
    {
        var act = () => NewProduct(price);

        act.Should().Throw<DomainException>().WithMessage("*price*");
    }

    [Fact]
    public void Creating_a_product_with_empty_name_is_rejected()
    {
        var act = () => new Product("  ", "desc", 10m, Guid.NewGuid());

        act.Should().Throw<DomainException>().WithMessage("*name*");
    }

    [Fact]
    public void ChangePrice_returns_the_old_price_and_applies_the_new_one()
    {
        var product = NewProduct(100m);

        var oldPrice = product.ChangePrice(80m);

        oldPrice.Should().Be(100m);
        product.Price.Should().Be(80m);
        product.UpdatedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public void ChangePrice_to_the_same_value_is_rejected()
    {
        var product = NewProduct(100m);

        var act = () => product.ChangePrice(100m);

        act.Should().Throw<DomainException>().WithMessage("*differ*");
    }

    [Fact]
    public void ChangePrice_to_non_positive_value_is_rejected()
    {
        var product = NewProduct(100m);

        var act = () => product.ChangePrice(0m);

        act.Should().Throw<DomainException>();
        product.Price.Should().Be(100m, "a rejected change must not alter the price");
    }

    [Fact]
    public void UpdateDetails_trims_the_name_and_marks_the_entity_updated()
    {
        var product = NewProduct();
        var newCategory = Guid.NewGuid();

        product.UpdateDetails("  Ergo Keyboard  ", "new desc", newCategory);

        product.Name.Should().Be("Ergo Keyboard");
        product.CategoryId.Should().Be(newCategory);
        product.UpdatedAtUtc.Should().NotBeNull();
    }
}

public class CategoryTests
{
    [Fact]
    public void Creating_a_category_with_empty_name_is_rejected()
    {
        var act = () => new Category("");

        act.Should().Throw<DomainException>();
    }

    [Fact]
    public void Update_replaces_name_and_description()
    {
        var category = new Category("Electronics", "old");

        category.Update("Gadgets", "new");

        category.Name.Should().Be("Gadgets");
        category.Description.Should().Be("new");
        category.UpdatedAtUtc.Should().NotBeNull();
    }
}

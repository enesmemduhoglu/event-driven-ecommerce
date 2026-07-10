using Basket.Api.Models;
using Basket.Api.Services;
using FluentAssertions;
using StackExchange.Redis;
using Testcontainers.Redis;
using Xunit;

namespace IntegrationTests;

[Trait("Category", "Integration")]
public class BasketRepositoryTests : IAsyncLifetime
{
    private readonly RedisContainer _redis = new RedisBuilder("redis:7-alpine").Build();
    private IConnectionMultiplexer _connection = default!;
    private RedisBasketRepository _repository = default!;

    public async Task InitializeAsync()
    {
        await _redis.StartAsync();
        _connection = await ConnectionMultiplexer.ConnectAsync(_redis.GetConnectionString());
        _repository = new RedisBasketRepository(_connection);
    }

    public async Task DisposeAsync()
    {
        await _connection.DisposeAsync();
        await _redis.DisposeAsync();
    }

    [Fact]
    public async Task Basket_round_trips_through_redis()
    {
        var basket = new CustomerBasket
        {
            UserId = "user-1",
            Items =
            [
                new BasketItem { ProductId = Guid.NewGuid(), ProductName = "Mouse", UnitPrice = 109.99m, Quantity = 2 }
            ]
        };

        await _repository.SaveAsync(basket);
        var loaded = await _repository.GetAsync("user-1");

        loaded.Should().NotBeNull();
        loaded!.Items.Should().ContainSingle();
        loaded.Items[0].ProductName.Should().Be("Mouse");
        loaded.TotalAmount.Should().Be(219.98m);
    }

    [Fact]
    public async Task Missing_basket_returns_null()
    {
        (await _repository.GetAsync("nobody")).Should().BeNull();
    }

    [Fact]
    public async Task Delete_removes_the_basket()
    {
        await _repository.SaveAsync(new CustomerBasket { UserId = "user-2" });

        await _repository.DeleteAsync("user-2");

        (await _repository.GetAsync("user-2")).Should().BeNull();
    }
}

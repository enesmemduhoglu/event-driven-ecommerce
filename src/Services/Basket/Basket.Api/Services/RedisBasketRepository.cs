using System.Text.Json;
using Basket.Api.Models;
using StackExchange.Redis;

namespace Basket.Api.Services;

public interface IBasketRepository
{
    Task<CustomerBasket?> GetAsync(string userId);
    Task<CustomerBasket> SaveAsync(CustomerBasket basket);
    Task DeleteAsync(string userId);
}

public class RedisBasketRepository : IBasketRepository
{
    // Abandoned baskets expire automatically.
    private static readonly TimeSpan BasketTtl = TimeSpan.FromDays(30);

    private readonly IDatabase _database;

    public RedisBasketRepository(IConnectionMultiplexer redis)
    {
        _database = redis.GetDatabase();
    }

    public async Task<CustomerBasket?> GetAsync(string userId)
    {
        var value = await _database.StringGetAsync(Key(userId));
        // explicit cast: RedisValue -> string; C# 14 span conversions otherwise make
        // the Deserialize(string)/Deserialize(ReadOnlySpan<byte>) overloads ambiguous
        return value.IsNullOrEmpty ? null : JsonSerializer.Deserialize<CustomerBasket>((string)value!);
    }

    public async Task<CustomerBasket> SaveAsync(CustomerBasket basket)
    {
        await _database.StringSetAsync(Key(basket.UserId), JsonSerializer.Serialize(basket), BasketTtl);
        return basket;
    }

    public Task DeleteAsync(string userId)
        => _database.KeyDeleteAsync(Key(userId));

    private static string Key(string userId) => $"basket:{userId}";
}

using Elastic.Clients.Elasticsearch;
using EventBus.Contracts.Catalog;
using MassTransit;
using Search.Api.Models;

namespace Search.Api.Consumers;

// Indexing by document id makes these consumers naturally idempotent:
// re-delivered messages simply overwrite the same document.

public class ProductCreatedConsumer : IConsumer<ProductCreated>
{
    private readonly ElasticsearchClient _client;

    public ProductCreatedConsumer(ElasticsearchClient client) => _client = client;

    public async Task Consume(ConsumeContext<ProductCreated> context)
    {
        var m = context.Message;
        var document = new ProductDocument
        {
            Id = m.ProductId,
            Name = m.Name,
            Description = m.Description,
            Price = m.Price,
            CategoryId = m.CategoryId,
            CategoryName = m.CategoryName,
            CreatedAtUtc = m.OccurredAtUtc
        };

        var response = await _client.IndexAsync(document, i => i
            .Index(SearchConstants.ProductsIndex)
            .Id(m.ProductId));

        response.ThrowIfFailed();
    }
}

public class ProductUpdatedConsumer : IConsumer<ProductUpdated>
{
    private readonly ElasticsearchClient _client;

    public ProductUpdatedConsumer(ElasticsearchClient client) => _client = client;

    public async Task Consume(ConsumeContext<ProductUpdated> context)
    {
        var m = context.Message;

        var response = await _client.UpdateAsync<ProductDocument, object>(
            SearchConstants.ProductsIndex, m.ProductId, u => u
                .Doc(new
                {
                    name = m.Name,
                    description = m.Description,
                    price = m.Price,
                    categoryId = m.CategoryId,
                    categoryName = m.CategoryName
                })
                .DocAsUpsert(false));

        response.ThrowIfFailed();
    }
}

public class ProductPriceChangedConsumer : IConsumer<ProductPriceChanged>
{
    private readonly ElasticsearchClient _client;

    public ProductPriceChangedConsumer(ElasticsearchClient client) => _client = client;

    public async Task Consume(ConsumeContext<ProductPriceChanged> context)
    {
        var m = context.Message;

        var response = await _client.UpdateAsync<ProductDocument, object>(
            SearchConstants.ProductsIndex, m.ProductId, u => u
                .Doc(new { price = m.NewPrice }));

        response.ThrowIfFailed();
    }
}

public class ProductDeletedConsumer : IConsumer<ProductDeleted>
{
    private readonly ElasticsearchClient _client;

    public ProductDeletedConsumer(ElasticsearchClient client) => _client = client;

    public async Task Consume(ConsumeContext<ProductDeleted> context)
    {
        // A 404 here just means the document was already removed — idempotent delete.
        await _client.DeleteAsync(SearchConstants.ProductsIndex, context.Message.ProductId);
    }
}

internal static class ElasticsearchResponseExtensions
{
    /// <summary>Throws so MassTransit retries / dead-letters the message instead of losing the index update.</summary>
    public static void ThrowIfFailed(this Elastic.Transport.Products.Elasticsearch.ElasticsearchResponse response)
    {
        if (!response.IsValidResponse)
        {
            throw new InvalidOperationException($"Elasticsearch operation failed: {response.DebugInformation}");
        }
    }
}

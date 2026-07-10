using Elastic.Clients.Elasticsearch;
using Search.Api.Models;

namespace Search.Api.Services;

/// <summary>Creates the products index with explicit mappings on startup (idempotent).</summary>
public class ProductIndexInitializer : IHostedService
{
    private readonly ElasticsearchClient _client;
    private readonly ILogger<ProductIndexInitializer> _logger;

    public ProductIndexInitializer(ElasticsearchClient client, ILogger<ProductIndexInitializer> logger)
    {
        _client = client;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var exists = await _client.Indices.ExistsAsync(SearchConstants.ProductsIndex, cancellationToken);
        if (exists.Exists)
        {
            return;
        }

        var response = await _client.Indices.CreateAsync<ProductDocument>(SearchConstants.ProductsIndex, c => c
            .Mappings(m => m
                .Properties(p => p
                    .Keyword(d => d.Id)
                    .Text(d => d.Name)
                    .Text(d => d.Description)
                    .DoubleNumber(d => d.Price)
                    .Keyword(d => d.CategoryId)
                    .Keyword(d => d.CategoryName)
                    .Date(d => d.CreatedAtUtc))), cancellationToken);

        if (response.IsValidResponse)
        {
            _logger.LogInformation("Created Elasticsearch index '{Index}'", SearchConstants.ProductsIndex);
        }
        else
        {
            _logger.LogError("Failed to create index '{Index}': {Error}",
                SearchConstants.ProductsIndex, response.DebugInformation);
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

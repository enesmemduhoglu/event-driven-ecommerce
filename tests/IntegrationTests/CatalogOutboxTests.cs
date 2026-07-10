using Catalog.Domain.Entities;
using Catalog.Infrastructure.Data;
using EventBus.Contracts.Catalog;
using FluentAssertions;
using MassTransit;
using MassTransit.EntityFrameworkCoreIntegration;
using MassTransit.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Verifies the transactional-outbox guarantee on a real Postgres: a published
/// event only becomes durable together with the business data (no dual write).
/// </summary>
[Trait("Category", "Integration")]
public class CatalogOutboxTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16-alpine").Build();

    private ServiceProvider _provider = default!;
    private ITestHarness _harness = default!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        _provider = new ServiceCollection()
            .AddDbContext<CatalogDbContext>(o => o.UseNpgsql(_postgres.GetConnectionString()))
            .AddMassTransitTestHarness(x =>
            {
                x.AddEntityFrameworkOutbox<CatalogDbContext>(o =>
                {
                    o.UsePostgres();
                    // Delivery is disabled so the outbox rows stay observable —
                    // these tests assert the atomic-write guarantee, not the relay
                    // (the relay is exercised by the running system / e2e script).
                    o.UseBusOutbox(bo => bo.DisableDeliveryService());
                });
            })
            .BuildServiceProvider(validateScopes: true);

        using (var scope = _provider.CreateScope())
        {
            await scope.ServiceProvider.GetRequiredService<CatalogDbContext>().Database.MigrateAsync();
        }

        _harness = _provider.GetRequiredService<ITestHarness>();
        await _harness.Start();
    }

    public async Task DisposeAsync()
    {
        await _provider.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact]
    public async Task Publish_without_SaveChanges_leaves_no_trace()
    {
        using (var scope = _provider.CreateScope())
        {
            var publishEndpoint = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();
            await publishEndpoint.Publish(new ProductDeleted(Guid.NewGuid(), DateTime.UtcNow));
            // Intentionally no SaveChangesAsync: simulates a failed business transaction.
        }

        using (var scope = _provider.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            (await dbContext.Set<OutboxMessage>().CountAsync()).Should().Be(0,
                "an uncommitted publish must not survive — that is the whole point of the outbox");
        }

        (await _harness.Published.Any<ProductDeleted>()).Should().BeFalse();
    }

    [Fact]
    public async Task Publish_with_SaveChanges_commits_event_and_entity_atomically()
    {
        var productId = Guid.NewGuid();

        using (var scope = _provider.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            var publishEndpoint = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();

            var category = new Category("Electronics");
            dbContext.Categories.Add(category);
            var product = new Product("Webcam", "4K webcam", 199.99m, category.Id);
            dbContext.Products.Add(product);
            productId = product.Id;

            await publishEndpoint.Publish(new ProductCreated(
                product.Id, product.Name, product.Description, product.Price,
                category.Id, category.Name, DateTime.UtcNow));

            await dbContext.SaveChangesAsync();
        }

        using (var scope = _provider.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
            (await dbContext.Products.AnyAsync(p => p.Id == productId)).Should().BeTrue();

            // The event was committed in the same transaction as the product row.
            var outboxMessages = await dbContext.Set<OutboxMessage>().AsNoTracking().ToListAsync();
            outboxMessages.Should().ContainSingle()
                .Which.MessageType.Should().Contain(nameof(ProductCreated));
        }
    }
}

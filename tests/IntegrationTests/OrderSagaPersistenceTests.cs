using EventBus.Contracts.Ordering;
using FluentAssertions;
using MassTransit;
using MassTransit.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Ordering.Infrastructure.Data;
using Ordering.Saga;
using Testcontainers.PostgreSql;
using Xunit;

namespace IntegrationTests;

/// <summary>
/// Runs the real state machine against the real EF Core saga repository on a
/// containerized Postgres — proves saga state survives outside process memory.
/// </summary>
[Trait("Category", "Integration")]
public class OrderSagaPersistenceTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16-alpine").Build();

    private ServiceProvider _provider = default!;
    private ITestHarness _harness = default!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        _provider = new ServiceCollection()
            .AddDbContext<OrderingDbContext>(o => o.UseNpgsql(_postgres.GetConnectionString()))
            .AddMassTransitTestHarness(x =>
            {
                x.AddSagaStateMachine<OrderStateMachine, OrderState>()
                    .EntityFrameworkRepository(r =>
                    {
                        r.ExistingDbContext<OrderingDbContext>();
                        r.UsePostgres();
                    });
            })
            .BuildServiceProvider(validateScopes: true);

        using (var scope = _provider.CreateScope())
        {
            await scope.ServiceProvider.GetRequiredService<OrderingDbContext>().Database.MigrateAsync();
        }

        _harness = _provider.GetRequiredService<ITestHarness>();
        await _harness.Start();
    }

    public async Task DisposeAsync()
    {
        await _provider.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    private async Task<string?> LoadPersistedState(Guid orderId)
    {
        using var scope = _provider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<OrderingDbContext>();
        var instance = await dbContext.Set<OrderState>().AsNoTracking()
            .SingleOrDefaultAsync(s => s.CorrelationId == orderId);
        return instance?.CurrentState;
    }

    /// <summary>
    /// The repository commits after the saga activity completes (and after any publishes
    /// are observed on the bus), so the persisted state is checked with a short poll.
    /// </summary>
    private async Task<string?> WaitForPersistedState(Guid orderId, string expected)
    {
        var deadline = DateTime.UtcNow + TimeSpan.FromSeconds(10);
        string? state = null;
        while (DateTime.UtcNow < deadline)
        {
            state = await LoadPersistedState(orderId);
            if (state == expected)
            {
                return state;
            }

            await Task.Delay(100);
        }

        return state;
    }

    [Fact]
    public async Task Saga_state_is_persisted_to_postgres_across_the_whole_lifecycle()
    {
        var orderId = NewId.NextGuid();

        await _harness.Bus.Publish(new OrderCreated(
            orderId, "user-1", "user@test.dev", 219.98m, "4111111111111111",
            [new OrderItem(Guid.NewGuid(), "Mouse", 109.99m, 2)], DateTime.UtcNow));
        var sagaHarness = _harness.GetSagaStateMachineHarness<OrderStateMachine, OrderState>();
        (await sagaHarness.Consumed.Any<OrderCreated>(x => x.Context.Message.OrderId == orderId)).Should().BeTrue();

        (await WaitForPersistedState(orderId, "AwaitingStockReservation")).Should().Be("AwaitingStockReservation");

        await _harness.Bus.Publish(new StockReserved(orderId));
        (await _harness.Published.Any<PaymentRequested>(x => x.Context.Message.OrderId == orderId)).Should().BeTrue();
        (await WaitForPersistedState(orderId, "AwaitingPayment")).Should().Be("AwaitingPayment");

        await _harness.Bus.Publish(new PaymentProcessed(orderId, NewId.NextGuid()));
        (await _harness.Published.Any<OrderConfirmed>(x => x.Context.Message.OrderId == orderId)).Should().BeTrue();
        (await WaitForPersistedState(orderId, "Confirmed")).Should().Be("Confirmed");
    }

    [Fact]
    public async Task Compensation_path_is_persisted_as_cancelled_with_reason()
    {
        var orderId = NewId.NextGuid();

        await _harness.Bus.Publish(new OrderCreated(
            orderId, "user-1", "user@test.dev", 99.99m, "4000000000000002",
            [new OrderItem(Guid.NewGuid(), "Mouse", 99.99m, 1)], DateTime.UtcNow));
        var sagaHarness = _harness.GetSagaStateMachineHarness<OrderStateMachine, OrderState>();
        (await sagaHarness.Consumed.Any<OrderCreated>(x => x.Context.Message.OrderId == orderId)).Should().BeTrue();

        await _harness.Bus.Publish(new StockReserved(orderId));
        (await _harness.Published.Any<PaymentRequested>(x => x.Context.Message.OrderId == orderId)).Should().BeTrue();

        await _harness.Bus.Publish(new PaymentFailed(orderId, "Card declined by issuer"));
        (await _harness.Published.Any<StockReleaseRequested>(x => x.Context.Message.OrderId == orderId)).Should().BeTrue();

        (await WaitForPersistedState(orderId, "Cancelled")).Should().Be("Cancelled");

        using var scope = _provider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<OrderingDbContext>();
        var instance = await dbContext.Set<OrderState>().AsNoTracking().SingleAsync(s => s.CorrelationId == orderId);
        instance.FailureReason.Should().Be("Card declined by issuer");
    }
}

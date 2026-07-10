using FluentAssertions;
using MassTransit;
using MassTransit.Testing;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.RabbitMq;
using Xunit;

namespace IntegrationTests;

public record TransportPing(Guid Id, string Text);

public class TransportPingConsumer : IConsumer<TransportPing>
{
    public Task Consume(ConsumeContext<TransportPing> context) => Task.CompletedTask;
}

/// <summary>Round-trips a message over a real RabbitMQ broker (not the in-memory transport).</summary>
[Trait("Category", "Integration")]
public class RabbitMqTransportTests : IAsyncLifetime
{
    private readonly RabbitMqContainer _rabbitMq = new RabbitMqBuilder("rabbitmq:3.13-management-alpine").Build();

    private ServiceProvider _provider = default!;
    private ITestHarness _harness = default!;

    public async Task InitializeAsync()
    {
        await _rabbitMq.StartAsync();

        _provider = new ServiceCollection()
            .AddMassTransitTestHarness(x =>
            {
                x.AddConsumer<TransportPingConsumer>();
                x.UsingRabbitMq((context, cfg) =>
                {
                    cfg.Host(new Uri(_rabbitMq.GetConnectionString()));
                    cfg.ConfigureEndpoints(context);
                });
            })
            .BuildServiceProvider(validateScopes: true);

        _harness = _provider.GetRequiredService<ITestHarness>();
        await _harness.Start();
    }

    public async Task DisposeAsync()
    {
        await _provider.DisposeAsync();
        await _rabbitMq.DisposeAsync();
    }

    [Fact]
    public async Task Message_published_to_rabbitmq_reaches_the_consumer()
    {
        var id = Guid.NewGuid();

        await _harness.Bus.Publish(new TransportPing(id, "hello over amqp"));

        (await _harness.Consumed.Any<TransportPing>(x => x.Context.Message.Id == id)).Should().BeTrue();

        var consumerHarness = _harness.GetConsumerHarness<TransportPingConsumer>();
        (await consumerHarness.Consumed.Any<TransportPing>(x => x.Context.Message.Id == id)).Should().BeTrue();
    }
}

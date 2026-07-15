using BuildingBlocks.Common.Auth;
using BuildingBlocks.Common.Middleware;
using BuildingBlocks.Common.Swagger;
using BuildingBlocks.Logging;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Ordering.Api.Consumers;
using Ordering.Infrastructure;
using Ordering.Infrastructure.Data;
using Ordering.Saga;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.UseSharedSerilog("ordering-api");

builder.Services.AddControllers();
builder.Services.AddOrderingInfrastructure(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddSwaggerWithJwt("Ordering API");
builder.Services.AddSharedTelemetry(builder.Configuration, "ordering-api");

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("OrderingDb")!, name: "postgres");

builder.Services.AddMassTransit(x =>
{
    // Outbox for API publishes (OrderCreated) + inbox/outbox on receive endpoints,
    // which makes the saga's own publishes transactional and consumption idempotent.
    x.AddEntityFrameworkOutbox<OrderingDbContext>(o =>
    {
        o.UsePostgres();
        o.UseBusOutbox();
        o.QueryDelay = TimeSpan.FromSeconds(1);
    });
    x.AddConfigureEndpointsCallback((context, _, cfg) =>
        cfg.UseEntityFrameworkOutbox<OrderingDbContext>(context));

    x.AddConsumer<OrderConfirmedConsumer>();
    x.AddConsumer<OrderCancelledConsumer>();

    x.AddSagaStateMachine<OrderStateMachine, OrderState>()
        .EntityFrameworkRepository(r =>
        {
            r.ExistingDbContext<OrderingDbContext>();
            r.UsePostgres();
        });

    // Service-prefixed queue names: each service gets its own queue per event
    // (otherwise same-named consumers across services would compete on one queue).
    x.SetEndpointNameFormatter(new KebabCaseEndpointNameFormatter("ordering", false));

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(builder.Configuration["RabbitMq:Host"] ?? "localhost", "/", h =>
        {
            h.Username(builder.Configuration["RabbitMq:Username"] ?? "guest");
            h.Password(builder.Configuration["RabbitMq:Password"] ?? "guest");
        });
        cfg.ConfigureEndpoints(context);
    });
});

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseGlobalExceptionHandling();

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapObservabilityEndpoints();

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<OrderingDbContext>().Database.MigrateAsync();
}

app.Run();

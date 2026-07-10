using BuildingBlocks.Common.Auth;
using BuildingBlocks.Common.Middleware;
using BuildingBlocks.Common.Swagger;
using BuildingBlocks.Logging;
using Inventory.Api.Consumers;
using Inventory.Api.Data;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.UseSharedSerilog("inventory-api");

builder.Services.AddControllers();
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddSwaggerWithJwt("Inventory API");
builder.Services.AddHealthChecks();

builder.Services.AddDbContext<InventoryDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("InventoryDb")));

builder.Services.AddMassTransit(x =>
{
    x.AddEntityFrameworkOutbox<InventoryDbContext>(o =>
    {
        o.UsePostgres();
        o.UseBusOutbox();
        o.QueryDelay = TimeSpan.FromSeconds(1);
    });
    // Inbox on receive endpoints: consuming is deduplicated and stock changes
    // commit atomically with the StockReserved/Failed publishes.
    x.AddConfigureEndpointsCallback((context, _, cfg) =>
    {
        cfg.UseMessageRetry(r => r.Interval(3, TimeSpan.FromMilliseconds(500)));
        cfg.UseEntityFrameworkOutbox<InventoryDbContext>(context);
    });

    x.AddConsumer<ProductCreatedConsumer>();
    x.AddConsumer<OrderCreatedConsumer>();
    x.AddConsumer<StockReleaseRequestedConsumer>();

    // Service-prefixed queue names: each service gets its own queue per event
    // (otherwise same-named consumers across services would compete on one queue).
    x.SetEndpointNameFormatter(new KebabCaseEndpointNameFormatter("inventory", false));

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
app.MapHealthChecks("/health");

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<InventoryDbContext>().Database.MigrateAsync();
}

app.Run();

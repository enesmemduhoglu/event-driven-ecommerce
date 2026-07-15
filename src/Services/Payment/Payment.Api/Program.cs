using BuildingBlocks.Common.Auth;
using BuildingBlocks.Common.Middleware;
using BuildingBlocks.Common.Swagger;
using BuildingBlocks.Logging;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Payment.Api.Consumers;
using Payment.Api.Data;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.UseSharedSerilog("payment-api");

builder.Services.AddControllers();
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddSwaggerWithJwt("Payment API");
builder.Services.AddSharedTelemetry(builder.Configuration, "payment-api");

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("PaymentDb")!, name: "postgres");

builder.Services.AddDbContext<PaymentDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PaymentDb")));

builder.Services.AddMassTransit(x =>
{
    x.AddEntityFrameworkOutbox<PaymentDbContext>(o =>
    {
        o.UsePostgres();
        o.UseBusOutbox();
        o.QueryDelay = TimeSpan.FromSeconds(1);
    });
    x.AddConfigureEndpointsCallback((context, _, cfg) =>
    {
        cfg.UseMessageRetry(r => r.Interval(3, TimeSpan.FromMilliseconds(500)));
        cfg.UseEntityFrameworkOutbox<PaymentDbContext>(context);
    });

    x.AddConsumer<PaymentRequestedConsumer>();

    // Service-prefixed queue names: each service gets its own queue per event
    // (otherwise same-named consumers across services would compete on one queue).
    x.SetEndpointNameFormatter(new KebabCaseEndpointNameFormatter("payment", false));

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
    await scope.ServiceProvider.GetRequiredService<PaymentDbContext>().Database.MigrateAsync();
}

app.Run();

using BuildingBlocks.Common.Auth;
using BuildingBlocks.Common.Middleware;
using BuildingBlocks.Common.Swagger;
using BuildingBlocks.Logging;
using Catalog.Infrastructure;
using Catalog.Infrastructure.Data;
using MassTransit;
using Microsoft.Extensions.FileProviders;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.UseSharedSerilog("catalog-api");

builder.Services.AddControllers();
builder.Services.AddCatalogInfrastructure(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddSwaggerWithJwt("Catalog API");
builder.Services.AddSharedTelemetry(builder.Configuration, "catalog-api");

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("CatalogDb")!, name: "postgres")
    .AddRedis(builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379", name: "redis");

builder.Services.AddStackExchangeRedisCache(options =>
    options.Configuration = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379");

builder.Services.AddMassTransit(x =>
{
    // Transactional outbox: publishes are written to catalog_db in the same
    // transaction as the entity change, then relayed to RabbitMQ (no dual-write).
    x.AddEntityFrameworkOutbox<CatalogDbContext>(o =>
    {
        o.UsePostgres();
        o.UseBusOutbox();
        o.QueryDelay = TimeSpan.FromSeconds(1);
    });

    // Service-prefixed queue names: each service gets its own queue per event
    // (otherwise same-named consumers across services would compete on one queue).
    x.SetEndpointNameFormatter(new KebabCaseEndpointNameFormatter("catalog", false));

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

// Uploaded product images. Explicit file provider: wwwroot may not exist on first
// run, in which case WebRootPath was resolved as null at builder time.
var webRoot = Path.Combine(builder.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(webRoot);
app.UseStaticFiles(new StaticFileOptions { FileProvider = new PhysicalFileProvider(webRoot) });

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapObservabilityEndpoints();

await CatalogDbSeeder.SeedAsync(app.Services);

app.Run();

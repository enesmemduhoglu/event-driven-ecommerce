using System.Threading.RateLimiting;
using BuildingBlocks.Logging;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.UseSharedSerilog("gateway-api");

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// Fixed-window rate limiting partitioned by client IP, applied to every proxied route.
var permitLimit = builder.Configuration.GetValue("RateLimiting:PermitLimit", 100);
var windowSeconds = builder.Configuration.GetValue("RateLimiting:WindowSeconds", 10);

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromSeconds(windowSeconds),
                QueueLimit = 0
            }));
});

builder.Services.AddSharedTelemetry(builder.Configuration, "gateway-api");
builder.Services.AddHealthChecks();

// Single pane of glass over every service's /health endpoint.
builder.Services.AddHealthChecksUI(options =>
{
    options.SetEvaluationTimeInSeconds(15);
    options.MaximumHistoryEntriesPerEndpoint(50);
}).AddInMemoryStorage();

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseRateLimiter();

app.MapGet("/", () => Results.Json(new
{
    service = "E-Commerce API Gateway",
    routes = new[] { "/api/auth", "/api/products", "/api/categories", "/api/search", "/api/basket", "/api/orders", "/api/inventory", "/hubs/notifications" }
}));
app.MapObservabilityEndpoints();
app.MapHealthChecksUI(options => options.UIPath = "/healthchecks-ui");

app.MapReverseProxy();

app.Run();

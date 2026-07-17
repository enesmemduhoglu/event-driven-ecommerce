using System.Threading.RateLimiting;
using BuildingBlocks.Logging;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.UseSharedSerilog("gateway-api");

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// Browser SPA'sı (src/Web) gateway'e cross-origin istek atar; SignalR negotiate
// credential gerektirdiği için origin listesi explicit olmak zorunda.
const string webCorsPolicy = "web-client";
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];

builder.Services.AddCors(options => options.AddPolicy(webCorsPolicy, policy => policy
    .WithOrigins(corsOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

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
// CORS, rate limiter'dan ÖNCE: preflight OPTIONS istekleri limit tüketmesin.
app.UseCors(webCorsPolicy);
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

using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace BuildingBlocks.Logging;

public static class ObservabilityExtensions
{
    /// <summary>
    /// Shared OpenTelemetry setup: traces (ASP.NET Core, HttpClient, MassTransit, Npgsql)
    /// exported via OTLP to Jaeger, and metrics exposed on /metrics for Prometheus.
    /// </summary>
    public static IServiceCollection AddSharedTelemetry(this IServiceCollection services, IConfiguration configuration, string serviceName)
    {
        var otlpEndpoint = new Uri(configuration["Otlp:Endpoint"] ?? "http://localhost:4317");

        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(serviceName))
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation(options =>
                    // Health and scrape probes would flood the trace store.
                    options.Filter = ctx =>
                        !ctx.Request.Path.StartsWithSegments("/health") &&
                        !ctx.Request.Path.StartsWithSegments("/metrics"))
                .AddHttpClientInstrumentation()
                .AddSource("MassTransit")   // consume/publish spans across services
                .AddSource("Npgsql")        // database spans
                .AddOtlpExporter(options => options.Endpoint = otlpEndpoint))
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddPrometheusExporter());

        return services;
    }

    /// <summary>Maps /metrics (Prometheus scrape) and /health with the detailed UI-compatible payload.</summary>
    public static WebApplication MapObservabilityEndpoints(this WebApplication app)
    {
        app.MapPrometheusScrapingEndpoint();
        app.MapHealthChecks("/health", new HealthCheckOptions
        {
            ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
        });

        return app;
    }
}

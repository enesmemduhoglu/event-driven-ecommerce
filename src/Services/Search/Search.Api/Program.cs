using BuildingBlocks.Common.Middleware;
using BuildingBlocks.Common.Swagger;
using BuildingBlocks.Logging;
using Elastic.Clients.Elasticsearch;
using MassTransit;
using Search.Api.Consumers;
using Search.Api.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.UseSharedSerilog("search-api");

builder.Services.AddControllers();
builder.Services.AddSwaggerWithJwt("Search API");
builder.Services.AddSharedTelemetry(builder.Configuration, "search-api");

var rabbitHealthCs = $"amqp://{builder.Configuration["RabbitMq:Username"] ?? "guest"}:{builder.Configuration["RabbitMq:Password"] ?? "guest"}@{builder.Configuration["RabbitMq:Host"] ?? "localhost"}:5672/";
builder.Services.AddHealthChecks()
    .AddElasticsearch(builder.Configuration["Elasticsearch:Url"] ?? "http://localhost:9200", name: "elasticsearch")
    .AddRabbitMQ(rabbitConnectionString: rabbitHealthCs, name: "rabbitmq");

builder.Services.AddSingleton(_ =>
{
    var url = builder.Configuration["Elasticsearch:Url"] ?? "http://localhost:9200";
    var settings = new ElasticsearchClientSettings(new Uri(url))
        .DefaultIndex(Search.Api.SearchConstants.ProductsIndex);
    return new ElasticsearchClient(settings);
});

builder.Services.AddHostedService<ProductIndexInitializer>();

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<ProductCreatedConsumer>();
    x.AddConsumer<ProductUpdatedConsumer>();
    x.AddConsumer<ProductPriceChangedConsumer>();
    x.AddConsumer<ProductDeletedConsumer>();

    // Service-prefixed queue names: each service gets its own queue per event
    // (otherwise same-named consumers across services would compete on one queue).
    x.SetEndpointNameFormatter(new KebabCaseEndpointNameFormatter("search", false));

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

app.MapControllers();
app.MapObservabilityEndpoints();

app.Run();

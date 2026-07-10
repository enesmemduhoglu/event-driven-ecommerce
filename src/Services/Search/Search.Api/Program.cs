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
builder.Services.AddHealthChecks();

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

    x.SetKebabCaseEndpointNameFormatter();

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
app.MapHealthChecks("/health");

app.Run();

using BuildingBlocks.Common.Middleware;
using BuildingBlocks.Common.Swagger;
using BuildingBlocks.Logging;
using Identity.Infrastructure;
using Identity.Infrastructure.Auth;
using Identity.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.UseSharedSerilog("identity-api");

builder.Services.AddControllers();
builder.Services.AddIdentityInfrastructure(builder.Configuration);
builder.Services.AddSwaggerWithJwt("Identity API");
builder.Services.AddHealthChecks();

// Identity validates its own tokens with the local signing key directly —
// no HTTP round-trip to its own JWKS endpoint.
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<SigningKeyProvider, IOptions<JwtOptions>>((options, keyProvider, jwtOptions) =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Value.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Value.Audience,
            ValidateLifetime = true,
            IssuerSigningKey = keyProvider.SigningKey,
            NameClaimType = "name",
            RoleClaimType = "role"
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseGlobalExceptionHandling();

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

// OIDC discovery + JWKS so every other service can validate RS256 tokens
// with the public key, without sharing any secret.
app.MapGet("/.well-known/openid-configuration", (IOptions<JwtOptions> jwt) => Results.Json(new
{
    issuer = jwt.Value.Issuer,
    jwks_uri = $"{jwt.Value.Issuer}/.well-known/jwks.json",
    id_token_signing_alg_values_supported = new[] { "RS256" }
}));

app.MapGet("/.well-known/jwks.json", (SigningKeyProvider keyProvider) =>
{
    var jwk = keyProvider.GetPublicJwk();
    return Results.Json(new
    {
        keys = new[]
        {
            new { kty = jwk.Kty, use = jwk.Use, kid = jwk.Kid, alg = jwk.Alg, n = jwk.N, e = jwk.E }
        }
    });
});

await IdentityDbSeeder.SeedAsync(app.Services);

app.Run();

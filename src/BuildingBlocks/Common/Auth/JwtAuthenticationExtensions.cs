using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace BuildingBlocks.Common.Auth;

public static class JwtAuthenticationExtensions
{
    /// <summary>
    /// Configures JWT bearer authentication against Identity.Api. Tokens are validated
    /// per-service using the RS256 public key fetched from Identity's JWKS endpoint
    /// (via OIDC discovery at {Jwt:Authority}/.well-known/openid-configuration).
    /// </summary>
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtSection = configuration.GetSection("Jwt");
        var authority = jwtSection["Authority"]
            ?? throw new InvalidOperationException("Missing configuration value 'Jwt:Authority'.");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authority;
                options.RequireHttpsMetadata = false; // dev: plain HTTP inside the compose network
                options.MapInboundClaims = false;     // keep raw claim types ("sub", "email", ...)
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtSection["Issuer"] ?? authority,
                    ValidateAudience = true,
                    ValidAudience = jwtSection["Audience"] ?? "ecommerce",
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                    // Tokens carry raw claim types since inbound claim mapping is off.
                    NameClaimType = "name",
                    RoleClaimType = "role"
                };

                // SignalR websocket/SSE connections cannot send an Authorization header;
                // the client passes the token as ?access_token=... on hub routes instead.
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        if (!string.IsNullOrEmpty(accessToken) &&
                            context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization();
        return services;
    }
}

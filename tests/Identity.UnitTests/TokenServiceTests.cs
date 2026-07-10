using FluentAssertions;
using Identity.Infrastructure;
using Identity.Infrastructure.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Identity.UnitTests;

public class TokenServiceTests : IDisposable
{
    private readonly string _keyPath = Path.Combine(Path.GetTempPath(), $"jwt-test-{Guid.NewGuid():N}.pem");
    private readonly SigningKeyProvider _keyProvider;
    private readonly TokenService _tokenService;
    private readonly JwtOptions _options = new()
    {
        Issuer = "http://identity.test",
        Audience = "ecommerce-test",
        AccessTokenMinutes = 30
    };

    public TokenServiceTests()
    {
        _keyProvider = new SigningKeyProvider(_keyPath);
        _tokenService = new TokenService(_keyProvider, Options.Create(_options));
    }

    public void Dispose()
    {
        if (File.Exists(_keyPath))
        {
            File.Delete(_keyPath);
        }
    }

    private static ApplicationUser NewUser() => new()
    {
        Id = "user-123",
        Email = "jane@test.dev",
        FirstName = "Jane",
        LastName = "Doe"
    };

    [Fact]
    public void Access_token_carries_expected_claims_and_key_id()
    {
        var (token, expiresAtUtc) = _tokenService.CreateAccessToken(NewUser(), ["Customer", "Admin"]);

        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(token);

        jwt.Kid.Should().Be(_keyProvider.KeyId);
        jwt.Alg.Should().Be("RS256");
        jwt.Issuer.Should().Be("http://identity.test");
        jwt.Audiences.Should().ContainSingle().Which.Should().Be("ecommerce-test");
        jwt.Subject.Should().Be("user-123");
        jwt.GetClaim("email").Value.Should().Be("jane@test.dev");
        jwt.GetClaim("name").Value.Should().Be("Jane Doe");
        jwt.Claims.Where(c => c.Type == "role").Select(c => c.Value)
            .Should().BeEquivalentTo("Customer", "Admin");
        expiresAtUtc.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(30), TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task Access_token_validates_against_the_published_public_key()
    {
        var (token, _) = _tokenService.CreateAccessToken(NewUser(), ["Customer"]);

        // Validate the way other services do: with the JWK exposed via JWKS.
        var publicJwk = _keyProvider.GetPublicJwk();
        var result = await new JsonWebTokenHandler().ValidateTokenAsync(token, new TokenValidationParameters
        {
            ValidIssuer = _options.Issuer,
            ValidAudience = _options.Audience,
            IssuerSigningKey = publicJwk
        });

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Refresh_tokens_are_long_and_unique()
    {
        var tokens = Enumerable.Range(0, 50).Select(_ => TokenService.CreateRefreshToken()).ToList();

        tokens.Should().OnlyHaveUniqueItems();
        tokens.Should().OnlyContain(t => t.Length >= 64);
    }
}

public class SigningKeyProviderTests
{
    [Fact]
    public void Key_is_persisted_and_reloaded_with_the_same_key_id()
    {
        var keyPath = Path.Combine(Path.GetTempPath(), $"jwt-test-{Guid.NewGuid():N}.pem");
        try
        {
            var first = new SigningKeyProvider(keyPath);
            File.Exists(keyPath).Should().BeTrue("the generated key must be persisted for restarts");

            var second = new SigningKeyProvider(keyPath);
            second.KeyId.Should().Be(first.KeyId, "reloading the same PEM must yield the same key id");
        }
        finally
        {
            File.Delete(keyPath);
        }
    }

    [Fact]
    public void Public_jwk_is_a_signing_rsa_key_without_private_material()
    {
        var keyPath = Path.Combine(Path.GetTempPath(), $"jwt-test-{Guid.NewGuid():N}.pem");
        try
        {
            var provider = new SigningKeyProvider(keyPath);
            var jwk = provider.GetPublicJwk();

            jwk.Kty.Should().Be("RSA");
            jwk.Use.Should().Be("sig");
            jwk.Alg.Should().Be("RS256");
            jwk.N.Should().NotBeNullOrEmpty();
            jwk.E.Should().NotBeNullOrEmpty();
            jwk.D.Should().BeNull("the JWKS endpoint must never expose the private exponent");
        }
        finally
        {
            File.Delete(keyPath);
        }
    }
}

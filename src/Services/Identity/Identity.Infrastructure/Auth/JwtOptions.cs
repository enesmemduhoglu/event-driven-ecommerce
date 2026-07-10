namespace Identity.Infrastructure.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "http://localhost:5001";
    public string Audience { get; set; } = "ecommerce";
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 7;
    public string SigningKeyPath { get; set; } = "keys/jwt-signing-key.pem";
}

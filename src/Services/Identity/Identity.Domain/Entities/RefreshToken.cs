using BuildingBlocks.Common.Domain;

namespace Identity.Domain.Entities;

public class RefreshToken : BaseEntity
{
    public string UserId { get; private set; } = default!;
    public string Token { get; private set; } = default!;
    public DateTime ExpiresAtUtc { get; private set; }
    public DateTime? RevokedAtUtc { get; private set; }
    public string? ReplacedByToken { get; private set; }

    private RefreshToken()
    {
        // EF Core
    }

    public RefreshToken(string userId, string token, DateTime expiresAtUtc)
    {
        UserId = userId;
        Token = token;
        ExpiresAtUtc = expiresAtUtc;
    }

    public bool IsActive => RevokedAtUtc is null && DateTime.UtcNow < ExpiresAtUtc;

    /// <summary>Revokes this token; on rotation the replacement token is recorded for audit.</summary>
    public void Revoke(string? replacedByToken = null)
    {
        RevokedAtUtc = DateTime.UtcNow;
        ReplacedByToken = replacedByToken;
        MarkUpdated();
    }
}

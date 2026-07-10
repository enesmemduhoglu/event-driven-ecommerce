using System.Security.Claims;

namespace BuildingBlocks.Common.Auth;

public static class ClaimsPrincipalExtensions
{
    public static string GetUserId(this ClaimsPrincipal principal)
        => principal.FindFirstValue("sub")
           ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? throw new InvalidOperationException("Authenticated principal does not contain a user id claim.");

    public static string GetEmail(this ClaimsPrincipal principal)
        => principal.FindFirstValue("email")
           ?? principal.FindFirstValue(ClaimTypes.Email)
           ?? throw new InvalidOperationException("Authenticated principal does not contain an email claim.");
}

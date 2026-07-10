using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Notification.Api.Hubs;

/// <summary>
/// Clients connect with their JWT (?access_token=... on the websocket) and receive
/// "orderStatusChanged" messages addressed to their user id.
/// </summary>
[Authorize]
public class NotificationHub : Hub
{
}

/// <summary>Routes SignalR user targeting by the JWT "sub" claim.</summary>
public class SubClaimUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
        => connection.User.FindFirst("sub")?.Value;
}

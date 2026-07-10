using BuildingBlocks.Common.Auth;
using Identity.Api.Models;
using Identity.Domain;
using Identity.Domain.Entities;
using Identity.Infrastructure;
using Identity.Infrastructure.Auth;
using Identity.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Identity.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly TokenService _tokenService;
    private readonly AppIdentityDbContext _dbContext;
    private readonly JwtOptions _jwtOptions;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        TokenService tokenService,
        AppIdentityDbContext dbContext,
        IOptions<JwtOptions> jwtOptions)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _dbContext = dbContext;
        _jwtOptions = jwtOptions.Value;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return ValidationProblem(new ValidationProblemDetails
            {
                Title = "Registration failed",
                Errors = { ["registration"] = result.Errors.Select(e => e.Description).ToArray() }
            });
        }

        await _userManager.AddToRoleAsync(user, Roles.Customer);
        return CreatedAtAction(nameof(Me), new { }, new { user.Id, user.Email });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            return Unauthorized(new ProblemDetails { Title = "Invalid email or password", Status = 401 });
        }

        return await IssueTokensAsync(user);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request)
    {
        var storedToken = await _dbContext.RefreshTokens
            .SingleOrDefaultAsync(t => t.Token == request.RefreshToken);

        if (storedToken is null || !storedToken.IsActive)
        {
            return Unauthorized(new ProblemDetails { Title = "Refresh token is invalid or expired", Status = 401 });
        }

        var user = await _userManager.FindByIdAsync(storedToken.UserId);
        if (user is null)
        {
            return Unauthorized(new ProblemDetails { Title = "User no longer exists", Status = 401 });
        }

        // Rotation: the presented token is revoked and a fresh one is issued in its place.
        var response = await IssueTokensAsync(user, revokeOnIssue: storedToken);
        return response;
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<MeResponse>> Me()
    {
        var user = await _userManager.FindByIdAsync(User.GetUserId());
        if (user is null)
        {
            return NotFound();
        }

        var roles = await _userManager.GetRolesAsync(user);
        return new MeResponse(user.Id, user.Email!, $"{user.FirstName} {user.LastName}".Trim(), roles.ToList());
    }

    private async Task<AuthResponse> IssueTokensAsync(ApplicationUser user, RefreshToken? revokeOnIssue = null)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var (accessToken, expiresAtUtc) = _tokenService.CreateAccessToken(user, roles);

        var refreshToken = new RefreshToken(
            user.Id,
            TokenService.CreateRefreshToken(),
            DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenDays));

        revokeOnIssue?.Revoke(replacedByToken: refreshToken.Token);

        _dbContext.RefreshTokens.Add(refreshToken);
        await _dbContext.SaveChangesAsync();

        return new AuthResponse(accessToken, refreshToken.Token, expiresAtUtc);
    }
}

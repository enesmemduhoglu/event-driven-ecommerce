using BuildingBlocks.Common.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Payment.Api.Data;

namespace Payment.Api.Controllers;

/// <summary>Internal/debug endpoint — Payment is intentionally not routed through the gateway.</summary>
[ApiController]
[Route("api/payments")]
[Authorize(Roles = "Admin")]
public class PaymentsController : ControllerBase
{
    private readonly PaymentDbContext _dbContext;

    public PaymentsController(PaymentDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("by-order/{orderId:guid}")]
    public async Task<ActionResult<PaymentRecord>> GetByOrder(Guid orderId)
    {
        return await _dbContext.Payments.AsNoTracking().SingleOrDefaultAsync(p => p.OrderId == orderId)
            ?? throw new NotFoundException(nameof(PaymentRecord), orderId);
    }
}

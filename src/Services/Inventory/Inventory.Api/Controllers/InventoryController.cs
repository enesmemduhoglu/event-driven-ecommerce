using System.ComponentModel.DataAnnotations;
using BuildingBlocks.Common.Exceptions;
using Inventory.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Api.Controllers;

public record SetQuantityRequest([Range(0, int.MaxValue)] int Quantity);

[ApiController]
[Route("api/inventory")]
public class InventoryController : ControllerBase
{
    private readonly InventoryDbContext _dbContext;

    public InventoryController(InventoryDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("{productId:guid}")]
    public async Task<ActionResult<StockItem>> Get(Guid productId)
    {
        return await _dbContext.StockItems.AsNoTracking().SingleOrDefaultAsync(s => s.ProductId == productId)
            ?? throw new NotFoundException(nameof(StockItem), productId);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{productId:guid}")]
    public async Task<ActionResult<StockItem>> SetQuantity(Guid productId, SetQuantityRequest request)
    {
        var stock = await _dbContext.StockItems.SingleOrDefaultAsync(s => s.ProductId == productId)
            ?? throw new NotFoundException(nameof(StockItem), productId);

        stock.AvailableQuantity = request.Quantity;
        await _dbContext.SaveChangesAsync();

        return stock;
    }
}

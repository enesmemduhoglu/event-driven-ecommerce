using Basket.Api.Models;
using Basket.Api.Services;
using BuildingBlocks.Common.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Basket.Api.Controllers;

[ApiController]
[Route("api/basket")]
[Authorize]
public class BasketController : ControllerBase
{
    private readonly IBasketRepository _repository;

    public BasketController(IBasketRepository repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<ActionResult<CustomerBasket>> Get()
    {
        var userId = User.GetUserId();
        return await _repository.GetAsync(userId) ?? new CustomerBasket { UserId = userId };
    }

    [HttpPost("items")]
    public async Task<ActionResult<CustomerBasket>> AddItem(AddItemRequest request)
    {
        var userId = User.GetUserId();
        var basket = await _repository.GetAsync(userId) ?? new CustomerBasket { UserId = userId };

        var existing = basket.Items.SingleOrDefault(i => i.ProductId == request.ProductId);
        if (existing is not null)
        {
            existing.Quantity += request.Quantity;
            existing.UnitPrice = request.UnitPrice;
        }
        else
        {
            basket.Items.Add(new BasketItem
            {
                ProductId = request.ProductId,
                ProductName = request.ProductName,
                UnitPrice = request.UnitPrice,
                Quantity = request.Quantity
            });
        }

        return await _repository.SaveAsync(basket);
    }

    [HttpPut("items/{productId:guid}")]
    public async Task<ActionResult<CustomerBasket>> UpdateQuantity(Guid productId, UpdateQuantityRequest request)
    {
        var userId = User.GetUserId();
        var basket = await _repository.GetAsync(userId);
        var item = basket?.Items.SingleOrDefault(i => i.ProductId == productId);
        if (basket is null || item is null)
        {
            return NotFound();
        }

        item.Quantity = request.Quantity;
        return await _repository.SaveAsync(basket);
    }

    [HttpDelete("items/{productId:guid}")]
    public async Task<ActionResult<CustomerBasket>> RemoveItem(Guid productId)
    {
        var userId = User.GetUserId();
        var basket = await _repository.GetAsync(userId);
        if (basket is null)
        {
            return NotFound();
        }

        basket.Items.RemoveAll(i => i.ProductId == productId);
        return await _repository.SaveAsync(basket);
    }

    [HttpDelete]
    public async Task<IActionResult> Clear()
    {
        await _repository.DeleteAsync(User.GetUserId());
        return NoContent();
    }
}

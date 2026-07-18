using BuildingBlocks.Common.Auth;
using BuildingBlocks.Common.Exceptions;
using BuildingBlocks.Common.Models;
using EventBus.Contracts.Ordering;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ordering.Api.Models;
using Ordering.Domain.Entities;
using Ordering.Infrastructure.Data;

namespace Ordering.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly OrderingDbContext _dbContext;
    private readonly IPublishEndpoint _publishEndpoint;

    public OrdersController(OrderingDbContext dbContext, IPublishEndpoint publishEndpoint)
    {
        _dbContext = dbContext;
        _publishEndpoint = publishEndpoint;
    }

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create(CreateOrderRequest request)
    {
        var userId = User.GetUserId();
        var userEmail = User.GetEmail();

        var order = new Order(
            userId,
            userEmail,
            request.ShippingAddress,
            request.Items.Select(i => new Domain.Entities.OrderItem(i.ProductId, i.ProductName, i.UnitPrice, i.Quantity)).ToList());

        _dbContext.Orders.Add(order);

        // Outbox: the event that starts the saga commits atomically with the order row.
        await _publishEndpoint.Publish(new OrderCreated(
            order.Id,
            userId,
            userEmail,
            order.TotalAmount,
            request.CardNumber,
            order.Items.Select(i => new EventBus.Contracts.Ordering.OrderItem(i.ProductId, i.ProductName, i.UnitPrice, i.Quantity)).ToList(),
            DateTime.UtcNow));

        await _dbContext.SaveChangesAsync();

        return AcceptedAtAction(nameof(GetById), new { id = order.Id }, OrderDto.From(order));
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrderDto>>> GetMine()
    {
        var userId = User.GetUserId();
        var orders = await _dbContext.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAtUtc)
            .ToListAsync();

        return orders.Select(OrderDto.From).ToList();
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("all")]
    public async Task<ActionResult<PagedResult<OrderDto>>> GetAll(
        [FromQuery] OrderStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbContext.Orders.AsNoTracking().Include(o => o.Items).AsQueryable();
        if (status.HasValue)
        {
            query = query.Where(o => o.Status == status.Value);
        }

        var total = await query.LongCountAsync();
        var orders = await query
            .OrderByDescending(o => o.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<OrderDto>(orders.Select(OrderDto.From).ToList(), total, page, pageSize);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/ship")]
    public async Task<ActionResult<OrderDto>> Ship(Guid id)
    {
        var order = await LoadOrderAsync(id);
        order.MarkShipped();

        // Outbox: committed atomically with the status change.
        await _publishEndpoint.Publish(new OrderShipped(order.Id, order.UserId, order.UserEmail));
        await _dbContext.SaveChangesAsync();

        return OrderDto.From(order);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/deliver")]
    public async Task<ActionResult<OrderDto>> Deliver(Guid id)
    {
        var order = await LoadOrderAsync(id);
        order.MarkDelivered();

        await _publishEndpoint.Publish(new OrderDelivered(order.Id, order.UserId, order.UserEmail));
        await _dbContext.SaveChangesAsync();

        return OrderDto.From(order);
    }

    private async Task<Order> LoadOrderAsync(Guid id)
        => await _dbContext.Orders
            .Include(o => o.Items)
            .SingleOrDefaultAsync(o => o.Id == id)
            ?? throw new NotFoundException(nameof(Order), id);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDto>> GetById(Guid id)
    {
        var order = await _dbContext.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .SingleOrDefaultAsync(o => o.Id == id)
            ?? throw new NotFoundException(nameof(Order), id);

        if (order.UserId != User.GetUserId() && !User.IsInRole("Admin"))
        {
            return Forbid();
        }

        return OrderDto.From(order);
    }
}

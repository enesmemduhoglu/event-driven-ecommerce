using System.Text.Json;
using BuildingBlocks.Common.Exceptions;
using BuildingBlocks.Common.Models;
using Catalog.Api.Models;
using Catalog.Domain.Entities;
using Catalog.Infrastructure.Data;
using EventBus.Contracts.Catalog;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private static readonly DistributedCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
    };

    private readonly CatalogDbContext _dbContext;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly IDistributedCache _cache;

    public ProductsController(CatalogDbContext dbContext, IPublishEndpoint publishEndpoint, IDistributedCache cache)
    {
        _dbContext = dbContext;
        _publishEndpoint = publishEndpoint;
        _cache = cache;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<ProductDto>>> GetAll(
        [FromQuery] Guid? categoryId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbContext.Products.AsNoTracking().Include(p => p.Category).AsQueryable();
        if (categoryId.HasValue)
        {
            query = query.Where(p => p.CategoryId == categoryId.Value);
        }

        var total = await query.LongCountAsync();
        var items = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProductDto(p.Id, p.Name, p.Description, p.Price, p.CategoryId, p.Category.Name, p.CreatedAtUtc))
            .ToListAsync();

        return new PagedResult<ProductDto>(items, total, page, pageSize);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductDto>> GetById(Guid id)
    {
        // Cache-aside: product details are read-heavy; writes below invalidate the entry.
        var cacheKey = CacheKey(id);
        var cached = await _cache.GetStringAsync(cacheKey);
        if (cached is not null)
        {
            return JsonSerializer.Deserialize<ProductDto>(cached)!;
        }

        var product = await LoadProductAsync(id, track: false);
        var dto = ToDto(product);

        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(dto), CacheOptions);
        return dto;
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(CreateProductRequest request)
    {
        var category = await _dbContext.Categories.SingleOrDefaultAsync(c => c.Id == request.CategoryId)
            ?? throw new NotFoundException(nameof(Category), request.CategoryId);

        var product = new Product(request.Name, request.Description, request.Price, category.Id);
        _dbContext.Products.Add(product);

        // Goes to the transactional outbox: committed atomically with the product row.
        await _publishEndpoint.Publish(new ProductCreated(
            product.Id, product.Name, product.Description, product.Price,
            category.Id, category.Name, DateTime.UtcNow));

        await _dbContext.SaveChangesAsync();

        var dto = new ProductDto(product.Id, product.Name, product.Description, product.Price,
            category.Id, category.Name, product.CreatedAtUtc);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, dto);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProductDto>> Update(Guid id, UpdateProductRequest request)
    {
        var product = await LoadProductAsync(id, track: true);
        var category = await _dbContext.Categories.SingleOrDefaultAsync(c => c.Id == request.CategoryId)
            ?? throw new NotFoundException(nameof(Category), request.CategoryId);

        product.UpdateDetails(request.Name, request.Description, category.Id);

        await _publishEndpoint.Publish(new ProductUpdated(
            product.Id, product.Name, product.Description, product.Price,
            category.Id, category.Name, DateTime.UtcNow));

        await _dbContext.SaveChangesAsync();
        await _cache.RemoveAsync(CacheKey(id));

        return new ProductDto(product.Id, product.Name, product.Description, product.Price,
            category.Id, category.Name, product.CreatedAtUtc);
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("{id:guid}/price")]
    public async Task<ActionResult<ProductDto>> ChangePrice(Guid id, ChangePriceRequest request)
    {
        var product = await LoadProductAsync(id, track: true);
        var oldPrice = product.ChangePrice(request.NewPrice);

        await _publishEndpoint.Publish(new ProductPriceChanged(
            product.Id, oldPrice, product.Price, DateTime.UtcNow));

        await _dbContext.SaveChangesAsync();
        await _cache.RemoveAsync(CacheKey(id));

        return ToDto(product);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var product = await LoadProductAsync(id, track: true);
        _dbContext.Products.Remove(product);

        await _publishEndpoint.Publish(new ProductDeleted(product.Id, DateTime.UtcNow));

        await _dbContext.SaveChangesAsync();
        await _cache.RemoveAsync(CacheKey(id));

        return NoContent();
    }

    private async Task<Product> LoadProductAsync(Guid id, bool track)
    {
        var query = _dbContext.Products.Include(p => p.Category).AsQueryable();
        if (!track)
        {
            query = query.AsNoTracking();
        }

        return await query.SingleOrDefaultAsync(p => p.Id == id)
            ?? throw new NotFoundException(nameof(Product), id);
    }

    private static string CacheKey(Guid id) => $"catalog:product:{id}";

    private static ProductDto ToDto(Product product) => new(
        product.Id, product.Name, product.Description, product.Price,
        product.CategoryId, product.Category.Name, product.CreatedAtUtc);
}

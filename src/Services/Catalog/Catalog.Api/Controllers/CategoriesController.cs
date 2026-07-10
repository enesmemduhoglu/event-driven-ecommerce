using BuildingBlocks.Common.Exceptions;
using Catalog.Api.Models;
using Catalog.Domain.Entities;
using Catalog.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Api.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly CatalogDbContext _dbContext;

    public CategoriesController(CatalogDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> GetAll()
    {
        var categories = await _dbContext.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Description))
            .ToListAsync();

        return categories;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CategoryDto>> GetById(Guid id)
    {
        var category = await _dbContext.Categories.AsNoTracking().SingleOrDefaultAsync(c => c.Id == id)
            ?? throw new NotFoundException(nameof(Category), id);

        return new CategoryDto(category.Id, category.Name, category.Description);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<CategoryDto>> Create(CreateCategoryRequest request)
    {
        var category = new Category(request.Name, request.Description);
        _dbContext.Categories.Add(category);
        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = category.Id },
            new CategoryDto(category.Id, category.Name, category.Description));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CategoryDto>> Update(Guid id, UpdateCategoryRequest request)
    {
        var category = await _dbContext.Categories.SingleOrDefaultAsync(c => c.Id == id)
            ?? throw new NotFoundException(nameof(Category), id);

        category.Update(request.Name, request.Description);
        await _dbContext.SaveChangesAsync();

        return new CategoryDto(category.Id, category.Name, category.Description);
    }
}

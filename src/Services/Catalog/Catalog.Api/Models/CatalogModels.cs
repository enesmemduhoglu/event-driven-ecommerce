using System.ComponentModel.DataAnnotations;

namespace Catalog.Api.Models;

public record CategoryDto(Guid Id, string Name, string? Description);

public record CreateCategoryRequest([Required, MaxLength(100)] string Name, [MaxLength(500)] string? Description);

public record UpdateCategoryRequest([Required, MaxLength(100)] string Name, [MaxLength(500)] string? Description);

public record ProductDto(
    Guid Id,
    string Name,
    string Description,
    decimal Price,
    Guid CategoryId,
    string CategoryName,
    DateTime CreatedAtUtc);

public record CreateProductRequest(
    [Required, MaxLength(200)] string Name,
    [Required, MaxLength(2000)] string Description,
    [Range(0.01, double.MaxValue)] decimal Price,
    [Required] Guid CategoryId);

public record UpdateProductRequest(
    [Required, MaxLength(200)] string Name,
    [Required, MaxLength(2000)] string Description,
    [Required] Guid CategoryId);

public record ChangePriceRequest([Range(0.01, double.MaxValue)] decimal NewPrice);

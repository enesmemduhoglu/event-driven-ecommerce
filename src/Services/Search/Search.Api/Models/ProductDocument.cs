namespace Search.Api.Models;

public class ProductDocument
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string Description { get; set; } = default!;
    public decimal Price { get; set; }
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = default!;
    public DateTime CreatedAtUtc { get; set; }
}

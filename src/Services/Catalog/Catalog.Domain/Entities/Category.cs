using BuildingBlocks.Common.Domain;
using BuildingBlocks.Common.Exceptions;

namespace Catalog.Domain.Entities;

public class Category : BaseEntity
{
    public string Name { get; private set; } = default!;
    public string? Description { get; private set; }

    private Category()
    {
        // EF Core
    }

    public Category(string name, string? description = null)
    {
        SetName(name);
        Description = description;
    }

    public void Update(string name, string? description)
    {
        SetName(name);
        Description = description;
        MarkUpdated();
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainException("Category name cannot be empty.");
        }

        Name = name.Trim();
    }
}

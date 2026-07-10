using Catalog.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Catalog.Infrastructure.Data;

public static class CatalogDbSeeder
{
    /// <summary>
    /// Applies migrations and seeds base categories. Products are intentionally NOT seeded:
    /// they should be created through the API so their integration events flow to Search.
    /// </summary>
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
        await dbContext.Database.MigrateAsync();

        if (!await dbContext.Categories.AnyAsync())
        {
            dbContext.Categories.AddRange(
                new Category("Electronics", "Phones, computers and accessories"),
                new Category("Books", "Printed and digital books"),
                new Category("Clothing", "Apparel and footwear"));

            await dbContext.SaveChangesAsync();
        }
    }
}

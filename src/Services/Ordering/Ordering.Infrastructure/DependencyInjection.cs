using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Ordering.Infrastructure.Data;

namespace Ordering.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddOrderingInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<OrderingDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("OrderingDb")));

        return services;
    }
}

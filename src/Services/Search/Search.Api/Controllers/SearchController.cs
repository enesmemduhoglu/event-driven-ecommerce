using BuildingBlocks.Common.Models;
using Elastic.Clients.Elasticsearch;
using Elastic.Clients.Elasticsearch.QueryDsl;
using Microsoft.AspNetCore.Mvc;
using Search.Api.Models;

namespace Search.Api.Controllers;

[ApiController]
[Route("api/search")]
public class SearchController : ControllerBase
{
    private readonly ElasticsearchClient _client;

    public SearchController(ElasticsearchClient client)
    {
        _client = client;
    }

    /// <summary>Full-text product search with category/price filtering, paging and price sorting.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<ProductDocument>>> Search(
        [FromQuery] string? q,
        [FromQuery] Guid? categoryId,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sort = null)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        Query textQuery = string.IsNullOrWhiteSpace(q)
            ? new MatchAllQuery()
            : new MultiMatchQuery
            {
                Query = q,
                Fields = new[] { "name^2", "description", "categoryName" },
                Fuzziness = new Fuzziness("AUTO")
            };

        var filters = new List<Query>();
        if (categoryId.HasValue)
        {
            filters.Add(new TermQuery { Field = "categoryId", Value = categoryId.Value.ToString() });
        }

        if (minPrice.HasValue || maxPrice.HasValue)
        {
            filters.Add(new NumberRangeQuery("price")
            {
                Gte = minPrice.HasValue ? (double)minPrice.Value : null,
                Lte = maxPrice.HasValue ? (double)maxPrice.Value : null
            });
        }

        var response = await _client.SearchAsync<ProductDocument>(s =>
        {
            s.Indices(SearchConstants.ProductsIndex)
                .From((page - 1) * pageSize)
                .Size(pageSize)
                .Query(new BoolQuery { Must = [textQuery], Filter = filters });

            switch (sort)
            {
                case "price_asc":
                    s.Sort(so => so.Field("price", f => f.Order(SortOrder.Asc)));
                    break;
                case "price_desc":
                    s.Sort(so => so.Field("price", f => f.Order(SortOrder.Desc)));
                    break;
            }
        });

        if (!response.IsValidResponse)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
            {
                Title = "Search backend unavailable",
                Status = StatusCodes.Status503ServiceUnavailable
            });
        }

        return new PagedResult<ProductDocument>(response.Documents.ToList(), response.Total, page, pageSize);
    }
}

namespace BuildingBlocks.Common.Exceptions;

/// <summary>Requested resource does not exist. Mapped to HTTP 404 by the global exception middleware.</summary>
public class NotFoundException : Exception
{
    public NotFoundException(string resourceName, object key)
        : base($"{resourceName} with key '{key}' was not found.")
    {
    }
}

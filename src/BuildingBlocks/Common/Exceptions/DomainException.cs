namespace BuildingBlocks.Common.Exceptions;

/// <summary>Violation of a business rule. Mapped to HTTP 400 by the global exception middleware.</summary>
public class DomainException : Exception
{
    public DomainException(string message) : base(message)
    {
    }
}

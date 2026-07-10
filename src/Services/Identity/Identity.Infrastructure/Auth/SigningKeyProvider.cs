using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;

namespace Identity.Infrastructure.Auth;

/// <summary>
/// Owns the RS256 signing key. The private key is loaded from a PEM file, or generated
/// and persisted on first run (dev convenience — the key path is gitignored).
/// The public part is exposed as a JWK so other services can validate tokens via JWKS.
/// </summary>
public class SigningKeyProvider
{
    private readonly RSA _rsa;

    public SigningKeyProvider(string keyPath)
    {
        _rsa = RSA.Create(2048);

        if (File.Exists(keyPath))
        {
            _rsa.ImportFromPem(File.ReadAllText(keyPath));
        }
        else
        {
            var directory = Path.GetDirectoryName(Path.GetFullPath(keyPath));
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            File.WriteAllText(keyPath, _rsa.ExportRSAPrivateKeyPem());
        }

        var modulus = _rsa.ExportParameters(includePrivateParameters: false).Modulus!;
        KeyId = Base64UrlEncoder.Encode(SHA256.HashData(modulus))[..16];
        SigningKey = new RsaSecurityKey(_rsa) { KeyId = KeyId };
    }

    public string KeyId { get; }

    public RsaSecurityKey SigningKey { get; }

    public JsonWebKey GetPublicJwk()
    {
        var publicKey = new RsaSecurityKey(_rsa.ExportParameters(includePrivateParameters: false))
        {
            KeyId = KeyId
        };

        var jwk = JsonWebKeyConverter.ConvertFromRSASecurityKey(publicKey);
        jwk.Use = "sig";
        jwk.Alg = SecurityAlgorithms.RsaSha256;
        return jwk;
    }
}

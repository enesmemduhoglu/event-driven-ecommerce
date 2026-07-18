using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

namespace Catalog.Api.Services;

public class ObjectStorageOptions
{
    public string ServiceUrl { get; set; } = "http://localhost:9000";
    public string AccessKey { get; set; } = "minioadmin";
    public string SecretKey { get; set; } = "minioadmin";
    public string Bucket { get; set; } = "product-images";
}

public interface IObjectStorage
{
    Task UploadAsync(string key, Stream content, string contentType, CancellationToken ct = default);
    Task DeleteByPrefixAsync(string prefix, CancellationToken ct = default);
    /// <summary>Creates the bucket (idempotent) and opens it to anonymous reads so the gateway can proxy images.</summary>
    Task EnsureBucketAsync(CancellationToken ct = default);
}

/// <summary>
/// S3-compatible object storage (MinIO locally; points at real S3 by config change only).
/// </summary>
public class S3ObjectStorage : IObjectStorage
{
    private readonly IAmazonS3 _client;
    private readonly ObjectStorageOptions _options;

    public S3ObjectStorage(IAmazonS3 client, IOptions<ObjectStorageOptions> options)
    {
        _client = client;
        _options = options.Value;
    }

    public async Task UploadAsync(string key, Stream content, string contentType, CancellationToken ct = default)
    {
        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _options.Bucket,
            Key = key,
            InputStream = content,
            ContentType = contentType
        }, ct);
    }

    public async Task DeleteByPrefixAsync(string prefix, CancellationToken ct = default)
    {
        var listed = await _client.ListObjectsV2Async(new ListObjectsV2Request
        {
            BucketName = _options.Bucket,
            Prefix = prefix
        }, ct);

        if (listed.S3Objects is not { Count: > 0 })
        {
            return;
        }

        await _client.DeleteObjectsAsync(new DeleteObjectsRequest
        {
            BucketName = _options.Bucket,
            Objects = listed.S3Objects.Select(o => new KeyVersion { Key = o.Key }).ToList()
        }, ct);
    }

    public async Task EnsureBucketAsync(CancellationToken ct = default)
    {
        try
        {
            await _client.PutBucketAsync(new PutBucketRequest { BucketName = _options.Bucket }, ct);
        }
        catch (AmazonS3Exception e) when (e.ErrorCode is "BucketAlreadyOwnedByYou" or "BucketAlreadyExists")
        {
            // Idempotent: bucket survives restarts.
        }

        await _client.PutBucketPolicyAsync(new PutBucketPolicyRequest
        {
            BucketName = _options.Bucket,
            Policy = $$"""
            {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow",
                  "Principal": { "AWS": ["*"] },
                  "Action": ["s3:GetObject"],
                  "Resource": ["arn:aws:s3:::{{_options.Bucket}}/*"]
                }
              ]
            }
            """
        }, ct);
    }

    public static IAmazonS3 CreateClient(ObjectStorageOptions options) => new AmazonS3Client(
        new BasicAWSCredentials(options.AccessKey, options.SecretKey),
        new AmazonS3Config
        {
            ServiceURL = options.ServiceUrl,
            // MinIO: path-style URLs and no AWS-side checksum negotiation.
            ForcePathStyle = true,
            RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
            ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED
        });
}

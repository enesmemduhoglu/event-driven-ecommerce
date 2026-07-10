using MailKit.Net.Smtp;
using MimeKit;

namespace Notification.Api.Services;

public class EmailSender
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailSender> _logger;

    public EmailSender(IConfiguration configuration, ILogger<EmailSender> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>Sends via smtp4dev in development — mails are visible in its UI, nothing leaves the machine.</summary>
    public async Task SendAsync(string to, string subject, string body)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("E-Commerce Platform", _configuration["Smtp:From"] ?? "noreply@ecommerce.dev"));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(
                _configuration["Smtp:Host"] ?? "localhost",
                _configuration.GetValue("Smtp:Port", 2525),
                useSsl: false);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
        catch (Exception ex)
        {
            // Email is best-effort in this demo; a failed mail should not fault the message.
            _logger.LogError(ex, "Failed to send email to {To}", to);
        }
    }
}

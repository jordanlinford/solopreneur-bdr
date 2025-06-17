import { google } from 'googleapis';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailData {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  fromEmail?: string;
}

interface GmailCredentials {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export class EmailSender {
  private oauth2Client: any;

  constructor(credentials?: GmailCredentials) {
    if (credentials) {
      this.oauth2Client = new google.auth.OAuth2(
        credentials.clientId,
        credentials.clientSecret,
        'http://localhost:3000/api/auth/callback/google'
      );
      
      this.oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });
    }
  }

  /**
   * Send email via Gmail API (user's connected Gmail account)
   */
  async sendViaGmail(emailData: EmailData): Promise<boolean> {
    if (!this.oauth2Client) {
      throw new Error('Gmail credentials not configured');
    }

    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      const emailContent = [
        `To: ${emailData.to}`,
        `Subject: ${emailData.subject}`,
        `From: ${emailData.fromName || 'Your Name'} <${emailData.fromEmail || 'your-email@gmail.com'}>`,
        '',
        emailData.body
      ].join('\n');

      const encodedEmail = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      console.log('Email sent via Gmail:', response.data.id);
      return true;
    } catch (error) {
      console.error('Error sending email via Gmail:', error);
      return false;
    }
  }

  /**
   * Send email via SendGrid (backup/alternative method)
   */
  async sendViaSendGrid(emailData: EmailData): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }

    try {
      const msg = {
        to: emailData.to,
        from: {
          email: emailData.fromEmail || process.env.FROM_EMAIL || 'noreply@yourdomain.com',
          name: emailData.fromName || 'Your Name'
        },
        subject: emailData.subject,
        text: emailData.body,
        html: emailData.body.replace(/\n/g, '<br>'),
      };

      await sgMail.send(msg);
      console.log('Email sent via SendGrid to:', emailData.to);
      return true;
    } catch (error) {
      console.error('Error sending email via SendGrid:', error);
      return false;
    }
  }

  /**
   * Send email with fallback (try Gmail first, then SendGrid)
   */
  async sendEmail(emailData: EmailData): Promise<boolean> {
    // Try Gmail first if credentials are available
    if (this.oauth2Client) {
      try {
        return await this.sendViaGmail(emailData);
      } catch (error) {
        console.log('Gmail failed, trying SendGrid fallback...');
      }
    }

    // Fallback to SendGrid
    return await this.sendViaSendGrid(emailData);
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulkEmails(emails: EmailData[], delayMs: number = 1000): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        const success = await this.sendEmail(email);
        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('Error sending bulk email:', error);
        failed++;
      }

      // Rate limiting - wait between emails
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return { sent, failed };
  }
}

/**
 * Replace template variables in email content
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\[${key}\\]`, 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
} 
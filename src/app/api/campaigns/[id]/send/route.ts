import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { EmailSender, replaceTemplateVariables, isValidEmail } from '@/lib/email-sender';
import { generateEmailSteps } from '@/lib/email-generator';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const campaignId = params.id;
    
    // Get campaign with prospects and sequences
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
      include: {
        prospects: {
          where: {
            status: 'PENDING'
          }
        },
        sequences: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!campaign) {
      return new NextResponse('Campaign not found', { status: 404 });
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'ACTIVE') {
      return new NextResponse('Campaign is not in a sendable state', { status: 400 });
    }

    // Get user's email credentials (you'll need to store these when user connects Gmail)
    const userAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google'
      }
    });

    let emailSender: EmailSender;
    
    if (userAccount?.access_token && userAccount?.refresh_token) {
      // Use user's Gmail account
      emailSender = new EmailSender({
        accessToken: userAccount.access_token,
        refreshToken: userAccount.refresh_token,
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      });
    } else {
      // Use SendGrid as fallback
      emailSender = new EmailSender();
    }

    const emailsToSend = [];
    const firstSequence = campaign.sequences[0]; // Send first email in sequence

    if (!firstSequence) {
      return new NextResponse('No email sequence found', { status: 400 });
    }

    // Prepare emails for all pending prospects
    for (const prospect of campaign.prospects) {
      if (!isValidEmail(prospect.email)) {
        console.warn(`Invalid email address: ${prospect.email}`);
        continue;
      }

      // Replace template variables
      const variables = {
        name: prospect.name || 'there',
        firstName: prospect.name?.split(' ')[0] || 'there',
        lastName: prospect.name?.split(' ').slice(1).join(' ') || '',
        company: prospect.company || 'your company',
        title: prospect.title || 'your role',
        sender_name: session.user.name || 'Your Name'
      };

      // For now, use a simple subject since Sequence model doesn't have subject field
      const personalizedSubject = `Quick question about ${variables.company}`;
      const personalizedBody = replaceTemplateVariables(firstSequence.content || '', variables);

      emailsToSend.push({
        to: prospect.email,
        subject: personalizedSubject,
        body: personalizedBody,
        fromName: session.user.name || undefined,
        fromEmail: session.user.email || undefined,
        prospectId: prospect.id
      });
    }

    if (emailsToSend.length === 0) {
      return new NextResponse('No valid emails to send', { status: 400 });
    }

    // Send emails with rate limiting (1 email per second to avoid spam filters)
    const results = await emailSender.sendBulkEmails(emailsToSend, 1000);

    // Update campaign and prospect statuses
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'ACTIVE',
        updatedAt: new Date()
      }
    });

    // Update prospects that were successfully contacted
    const successfulEmails = emailsToSend.slice(0, results.sent);
    if (successfulEmails.length > 0) {
      await prisma.prospect.updateMany({
        where: {
          id: {
            in: successfulEmails.map(email => email.prospectId)
          }
        },
        data: {
          status: 'contacted'
        }
      });

      // Create interaction records
      const interactions = successfulEmails.map(email => ({
        prospectId: email.prospectId,
        type: 'email_sent',
        content: email.body
      }));

      await prisma.interaction.createMany({
        data: interactions
      });
    }

    return NextResponse.json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      total: emailsToSend.length,
      message: `Successfully sent ${results.sent} emails out of ${emailsToSend.length} total`
    });

  } catch (error) {
    console.error('Error sending campaign emails:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 
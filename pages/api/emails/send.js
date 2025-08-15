import { resend } from '../../../lib/resend';
import { prisma } from '../../../lib/db';
import { getTokenFromRequest, verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const token = getTokenFromRequest(req);
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { 
        subject, 
        content, 
        recipients, 
        fromEmail = 'hello@fastapply.co',
        personalizeNames = true,
        useTemplate = false
    } = req.body;

    if (!recipients || recipients.length === 0) {
        return res.status(400).json({ message: 'No recipients specified' });
    }

    try {
        const results = [];
        const errors = [];

        // Function to personalize content for each recipient
        const personalizeContent = (htmlContent, recipient) => {
            if (!personalizeNames) return htmlContent;

            return htmlContent
                .replace(/\{\{NAME\}\}/g, recipient.name || 'Valued Customer')
                .replace(/\{\{EMAIL\}\}/g, recipient.email)
                .replace(/\{\{FIRST_NAME\}\}/g, (recipient.name || '').split(' ')[0] || 'Friend')
                .replace(/\{\{COMPANY_NAME\}\}/g, 'Your Company') // You can make this configurable
                .replace(/\{\{NEWSLETTER_SUBTITLE\}\}/g, 'Weekly Newsletter')
                .replace(/\{\{COMPANY_ADDRESS\}\}/g, '123 Main St, City, State 12345');
        };

        // Function to personalize subject line
        const personalizeSubject = (subjectLine, recipient) => {
            if (!personalizeNames) return subjectLine;

            return subjectLine
                .replace(/\{\{NAME\}\}/g, recipient.name || 'Valued Customer')
                .replace(/\{\{EMAIL\}\}/g, recipient.email)
                .replace(/\{\{FIRST_NAME\}\}/g, (recipient.name || '').split(' ')[0] || 'Friend')
                .replace(/\{\{COMPANY_NAME\}\}/g, 'Your Company');
        };

        // Send emails in batches to avoid rate limits
        for (const recipient of recipients) {
            try {
                // Personalize content and subject for this recipient
                const personalizedContent = personalizeContent(content, recipient);
                const personalizedSubject = personalizeSubject(subject, recipient);

                // Add email tracking wrapper if using templates
                let finalContent = personalizedContent;
                if (useTemplate) {
                    finalContent = `
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>${personalizedSubject}</title>
                        </head>
                        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
                            ${personalizedContent}
                        </body>
                        </html>
                    `;
                }

                // Prepare email data
                const emailData = {
                    from: fromEmail,
                    to: recipient.email,
                    subject: personalizedSubject,
                    html: finalContent,
                };

                // Add tags only if they're supported (some email providers don't support tags)
                if (process.env.RESEND_API_KEY) {
                    emailData.tags = [
                        { name: 'campaign_type', value: useTemplate ? 'newsletter' : 'basic' },
                        { name: 'personalized', value: personalizeNames ? 'yes' : 'no' }
                    ];
                }

                console.log(`Sending email to ${recipient.email}...`);
                const result = await resend.emails.send(emailData);

                // Handle different response formats
                let emailId = 'unknown';
                if (result && typeof result === 'object') {
                    emailId = result.id || result.data?.id || result.messageId || 'sent_successfully';
                } else if (typeof result === 'string') {
                    emailId = result;
                }

                results.push({
                    email: recipient.email,
                    name: recipient.name,
                    id: emailId,
                    status: 'sent',
                    timestamp: new Date().toISOString(),
                });

                console.log(`✅ Email sent to ${recipient.email} with ID: ${emailId}`);

            } catch (error) {
                console.error(`❌ Failed to send email to ${recipient.email}:`, error);
                
                // Extract meaningful error message
                let errorMessage = error.message;
                if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response?.statusText) {
                    errorMessage = `${error.response.status}: ${error.response.statusText}`;
                }

                errors.push({
                    email: recipient.email,
                    name: recipient.name,
                    error: errorMessage,
                    timestamp: new Date().toISOString(),
                });
            }

            // Small delay to respect rate limits (adjust based on your email provider)
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Save campaign to database
        try {
            await prisma.campaign.create({
                data: {
                    subject: subject,
                    content: content,
                    sentAt: new Date(),
                    userId: decoded.userId,
                    recipientCount: recipients.length,
                    successCount: results.length,
                    failureCount: errors.length,
                    isPersonalized: personalizeNames,
                    templateUsed: useTemplate,
                },
            });
        } catch (dbError) {
            console.error('Failed to save campaign to database:', dbError);
            // Continue anyway - email sending is more important than logging
        }

        // Return detailed results
        res.status(200).json({
            sent: results.length,
            failed: errors.length,
            total: recipients.length,
            results,
            errors,
            summary: {
                successRate: ((results.length / recipients.length) * 100).toFixed(1),
                personalizedEmails: personalizeNames,
                templateUsed: useTemplate
            }
        });

    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ 
            message: 'Failed to send emails', 
            error: error.message,
            sent: results.length,
            failed: error.length
        });
    }
}
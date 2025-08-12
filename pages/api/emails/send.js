// File: pages/api/emails/send.js

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

    const { subject, content, recipients, fromEmail = 'noreply@yourdomain.com' } = req.body;

    if (!recipients || recipients.length === 0) {
        return res.status(400).json({ message: 'No recipients specified' });
    }

    try {
        const results = [];
        const errors = [];

        // Send emails in batches to avoid rate limits
        for (const recipient of recipients) {
            try {
                const result = await resend.emails.send({
                    from: fromEmail,
                    to: recipient.email,
                    subject: subject,
                    html: content,
                });

                results.push({
                    email: recipient.email,
                    id: result.id,
                    status: 'sent',
                });
            } catch (error) {
                errors.push({
                    email: recipient.email,
                    error: error.message,
                });
            }

            // Small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Save campaign
        await prisma.campaign.create({
            data: {
                subject,
                content,
                sentAt: new Date(),
                userId: decoded.userId,
            },
        });

        res.status(200).json({
            sent: results.length,
            failed: errors.length,
            results,
            errors,
        });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ message: 'Failed to send emails' });
    }
}
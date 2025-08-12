import { prisma } from '../../../lib/db';
import { getTokenFromRequest, verifyToken } from '../../../lib/auth';
import Papa from 'papaparse';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const token = getTokenFromRequest(req);
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { csvData } = req.body;

    try {
        const parsed = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
        });

        const contacts = [];
        const errors = [];

        for (let i = 0; i < parsed.data.length; i++) {
            const row = parsed.data[i];
            const email = row.email || row.Email;
            const name = row.name || row.Name || '';

            if (!email) {
                errors.push(`Row ${i + 1}: Missing email`);
                continue;
            }

            try {
                const contact = await prisma.contact.create({
                    data: {
                        email: email.trim().toLowerCase(),
                        name: name.trim(),
                        userId: decoded.userId,
                    },
                });
                contacts.push(contact);
            } catch (error) {
                if (error.code === 'P2002') {
                    errors.push(`Row ${i + 1}: Email ${email} already exists`);
                } else {
                    errors.push(`Row ${i + 1}: Failed to create contact`);
                }
            }
        }

        res.status(200).json({
            imported: contacts.length,
            errors: errors.length,
            errorMessages: errors,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to process CSV' });
    }
}
// pages/api/emails/import.js
import { db } from '../../../lib/firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
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

    if (!csvData) {
        return res.status(400).json({ message: 'CSV data is required' });
    }

    try {
        const parsed = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
        });

        const contacts = [];
        const errors = [];

        // Get existing contacts to check for duplicates
        const existingContactsQuery = query(
            collection(db, 'contacts'),
            where('userId', '==', decoded.userId)
        );

        const existingContactsSnap = await getDocs(existingContactsQuery);
        const existingEmails = new Set(
            existingContactsSnap.docs.map(doc => doc.data().email.toLowerCase())
        );

        for (let i = 0; i < parsed.data.length; i++) {
            const row = parsed.data[i];
            const email = (row.email || row.Email || '').trim();
            const name = (row.name || row.Name || '').trim();

            if (!email) {
                errors.push(`Row ${i + 1}: Missing email`);
                continue;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errors.push(`Row ${i + 1}: Invalid email format: ${email}`);
                continue;
            }

            const emailLower = email.toLowerCase();

            // Check if email already exists
            if (existingEmails.has(emailLower)) {
                errors.push(`Row ${i + 1}: Email ${email} already exists`);
                continue;
            }

            try {
                // Create new contact in Firebase
                const contactRef = await addDoc(collection(db, 'contacts'), {
                    email: emailLower,
                    name: name,
                    userId: decoded.userId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    source: 'csv_import'
                });

                contacts.push({
                    id: contactRef.id,
                    email: emailLower,
                    name: name,
                    userId: decoded.userId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                // Add to existing emails set to prevent duplicates within the same import
                existingEmails.add(emailLower);

            } catch (error) {
                console.error(`Failed to create contact for ${email}:`, error);
                errors.push(`Row ${i + 1}: Failed to create contact for ${email}`);
            }
        }

        // Save import statistics
        try {
            await addDoc(collection(db, 'importHistory'), {
                userId: decoded.userId,
                totalRows: parsed.data.length,
                successfulImports: contacts.length,
                failedImports: errors.length,
                importedAt: new Date(),
                errors: errors.slice(0, 10), // Store first 10 errors only
                source: 'csv_upload'
            });
        } catch (error) {
            console.error('Failed to save import history:', error);
        }

        res.status(200).json({
            imported: contacts.length,
            errors: errors.length,
            errorMessages: errors,
            totalProcessed: parsed.data.length,
            summary: {
                successRate: ((contacts.length / parsed.data.length) * 100).toFixed(1),
                duplicatesSkipped: errors.filter(e => e.includes('already exists')).length,
                invalidEmails: errors.filter(e => e.includes('Invalid email format')).length,
                missingEmails: errors.filter(e => e.includes('Missing email')).length
            }
        });
    } catch (error) {
        console.error('CSV import error:', error);
        res.status(500).json({
            message: 'Failed to process CSV',
            error: error.message
        });
    }
}
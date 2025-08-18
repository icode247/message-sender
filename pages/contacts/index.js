// pages/api/contacts/index.js
import { db } from '../../../lib/firebase';
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    limit as limitQuery,
    startAfter
} from 'firebase/firestore';
import { getTokenFromRequest, verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
    const token = getTokenFromRequest(req);
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = decoded.userId;

    if (req.method === 'GET') {
        try {
            const { page = 1, limit = 100, search = '' } = req.query;

            let contactsQuery = query(
                collection(db, 'contacts'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );

            // Add pagination
            if (parseInt(page) > 1) {
                const offset = (parseInt(page) - 1) * parseInt(limit);
                contactsQuery = query(contactsQuery, limitQuery(parseInt(limit)));
            } else {
                contactsQuery = query(contactsQuery, limitQuery(parseInt(limit)));
            }

            const contactsSnap = await getDocs(contactsQuery);
            let contacts = contactsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
            }));

            // Apply search filter (Firebase doesn't support case-insensitive search directly)
            if (search) {
                const searchLower = search.toLowerCase();
                contacts = contacts.filter(contact =>
                    contact.email?.toLowerCase().includes(searchLower) ||
                    contact.name?.toLowerCase().includes(searchLower)
                );
            }

            res.status(200).json({ contacts, totalCount: contacts.length });
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
            res.status(500).json({ message: 'Failed to fetch contacts' });
        }
    } else if (req.method === 'POST') {
        const { email, name } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        try {
            // Check if contact already exists
            const existingContactQuery = query(
                collection(db, 'contacts'),
                where('userId', '==', userId),
                where('email', '==', email.toLowerCase())
            );

            const existingContactSnap = await getDocs(existingContactQuery);

            if (!existingContactSnap.empty) {
                return res.status(400).json({
                    message: 'Contact already exists',
                    existingId: existingContactSnap.docs[0].id
                });
            }

            // Create new contact
            const contactRef = await addDoc(collection(db, 'contacts'), {
                email: email.toLowerCase(),
                name: name || '',
                userId,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const newContact = {
                id: contactRef.id,
                email: email.toLowerCase(),
                name: name || '',
                userId,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            res.status(201).json(newContact);
        } catch (error) {
            console.error('Failed to create contact:', error);
            res.status(500).json({ message: 'Failed to create contact' });
        }
    } else if (req.method === 'DELETE') {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ message: 'Contact ID is required' });
        }

        try {
            // Verify the contact belongs to this user
            const contactRef = doc(db, 'contacts', id);
            await deleteDoc(contactRef);

            res.status(200).json({ message: 'Contact deleted successfully' });
        } catch (error) {
            console.error('Failed to delete contact:', error);
            res.status(500).json({ message: 'Failed to delete contact' });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
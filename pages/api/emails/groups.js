// pages/api/emails/groups.js
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
    getDoc
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
            // Fetch groups for this user
            const groupsQuery = query(
                collection(db, 'groups'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );

            const groupsSnap = await getDocs(groupsQuery);
            const groups = [];

            for (const groupDoc of groupsSnap.docs) {
                const groupData = {
                    id: groupDoc.id,
                    ...groupDoc.data(),
                    createdAt: groupDoc.data().createdAt?.toDate?.() || new Date(groupDoc.data().createdAt),
                    contacts: []
                };

                // Fetch contacts for this group
                if (groupData.contactIds && groupData.contactIds.length > 0) {
                    const contactsQuery = query(
                        collection(db, 'contacts'),
                        where('userId', '==', userId)
                    );

                    const contactsSnap = await getDocs(contactsQuery);
                    const allContacts = contactsSnap.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    // Filter contacts that belong to this group
                    groupData.contacts = groupData.contactIds.map(contactId => {
                        const contact = allContacts.find(c => c.id === contactId);
                        return contact ? { contact } : null;
                    }).filter(Boolean);
                }

                groups.push(groupData);
            }

            res.status(200).json(groups);
        } catch (error) {
            console.error('Failed to fetch groups:', error);
            res.status(500).json({ message: 'Failed to fetch groups' });
        }
    } else if (req.method === 'POST') {
        const { name, description, contactIds } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Group name is required' });
        }

        if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            return res.status(400).json({ message: 'At least one contact must be selected' });
        }

        try {
            // Check if group name already exists for this user
            const existingGroupQuery = query(
                collection(db, 'groups'),
                where('userId', '==', userId),
                where('name', '==', name.trim())
            );

            const existingGroupSnap = await getDocs(existingGroupQuery);

            if (!existingGroupSnap.empty) {
                return res.status(400).json({ message: 'A group with this name already exists' });
            }

            // Verify all contact IDs belong to this user
            const contactsQuery = query(
                collection(db, 'contacts'),
                where('userId', '==', userId)
            );

            const contactsSnap = await getDocs(contactsQuery);
            const validContactIds = contactsSnap.docs.map(doc => doc.id);

            const invalidContactIds = contactIds.filter(id => !validContactIds.includes(id));

            if (invalidContactIds.length > 0) {
                return res.status(400).json({
                    message: `Invalid contact IDs: ${invalidContactIds.join(', ')}`
                });
            }

            // Create the group
            const groupRef = await addDoc(collection(db, 'groups'), {
                name: name.trim(),
                description: description?.trim() || '',
                userId,
                contactIds,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Fetch the created group with contacts
            const newGroup = {
                id: groupRef.id,
                name: name.trim(),
                description: description?.trim() || '',
                userId,
                contactIds,
                createdAt: new Date(),
                updatedAt: new Date(),
                contacts: []
            };

            // Get contact details
            const allContacts = contactsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            newGroup.contacts = contactIds.map(contactId => {
                const contact = allContacts.find(c => c.id === contactId);
                return contact ? { contact } : null;
            }).filter(Boolean);

            res.status(201).json(newGroup);
        } catch (error) {
            console.error('Failed to create group:', error);
            res.status(500).json({ message: 'Failed to create group' });
        }
    } else if (req.method === 'DELETE') {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ message: 'Group ID is required' });
        }

        try {
            // Verify the group belongs to this user
            const groupRef = doc(db, 'groups', id);
            const groupSnap = await getDoc(groupRef);

            if (!groupSnap.exists() || groupSnap.data().userId !== userId) {
                return res.status(404).json({ message: 'Group not found' });
            }

            await deleteDoc(groupRef);

            res.status(200).json({ message: 'Group deleted successfully' });
        } catch (error) {
            console.error('Failed to delete group:', error);
            res.status(500).json({ message: 'Failed to delete group' });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
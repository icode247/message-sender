import { prisma } from '../../../lib/db';
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
            const groups = await prisma.group.findMany({
                where: { userId },
                include: {
                    contacts: {
                        include: {
                            contact: true,
                        },
                    },
                },
            });

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
            // First, verify that all contact IDs belong to this user
            const validContacts = await prisma.contact.findMany({
                where: {
                    id: { in: contactIds },
                    userId: userId
                },
                select: { id: true }
            });

            const validContactIds = validContacts.map(c => c.id);
            const invalidContactIds = contactIds.filter(id => !validContactIds.includes(id));

            if (invalidContactIds.length > 0) {
                return res.status(400).json({
                    message: `Invalid contact IDs: ${invalidContactIds.join(', ')}`
                });
            }

            // Create the group with valid contacts
            const group = await prisma.group.create({
                data: {
                    name: name.trim(),
                    description: description?.trim() || null,
                    userId,
                    contacts: {
                        create: validContactIds.map(contactId => ({ contactId })),
                    },
                },
                include: {
                    contacts: {
                        include: {
                            contact: true,
                        },
                    },
                },
            });

            res.status(201).json(group);
        } catch (error) {
            console.error('Failed to create group:', error);

            // Handle duplicate group name error
            if (error.code === 'P2002') {
                res.status(400).json({ message: 'A group with this name already exists' });
            } else {
                res.status(500).json({ message: 'Failed to create group' });
            }
        }
    } else if (req.method === 'DELETE') {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ message: 'Group ID is required' });
        }

        try {
            // Verify the group belongs to this user before deleting
            const group = await prisma.group.findFirst({
                where: {
                    id,
                    userId,
                },
            });

            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            await prisma.group.delete({
                where: {
                    id,
                },
            });

            res.status(200).json({ message: 'Group deleted successfully' });
        } catch (error) {
            console.error('Failed to delete group:', error);
            res.status(500).json({ message: 'Failed to delete group' });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
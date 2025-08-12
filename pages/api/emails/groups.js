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
            res.status(500).json({ message: 'Failed to fetch groups' });
        }
    } else if (req.method === 'POST') {
        const { name, description, contactIds } = req.body;

        try {
            const group = await prisma.group.create({
                data: {
                    name,
                    description,
                    userId,
                    contacts: {
                        create: contactIds.map(contactId => ({ contactId })),
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
            res.status(500).json({ message: 'Failed to create group' });
        }
    } else if (req.method === 'DELETE') {
        const { id } = req.query;

        try {
            await prisma.group.delete({
                where: {
                    id,
                    userId,
                },
            });

            res.status(200).json({ message: 'Group deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to delete group' });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
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
            const contacts = await prisma.contact.findMany({
                where: { userId },
                include: {
                    groups: {
                        include: {
                            group: true,
                        },
                    },
                },
            });

            res.status(200).json(contacts);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch contacts' });
        }
    } else if (req.method === 'POST') {
        const { email, name } = req.body;

        try {
            const contact = await prisma.contact.create({
                data: {
                    email,
                    name,
                    userId,
                },
            });

            res.status(201).json(contact);
        } catch (error) {
            if (error.code === 'P2002') {
                res.status(400).json({ message: 'Contact already exists' });
            } else {
                res.status(500).json({ message: 'Failed to create contact' });
            }
        }
    } else if (req.method === 'DELETE') {
        const { id } = req.query;

        try {
            await prisma.contact.delete({
                where: {
                    id,
                    userId,
                },
            });

            res.status(200).json({ message: 'Contact deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to delete contact' });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
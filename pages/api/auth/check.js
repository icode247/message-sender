import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get token from cookie or Authorization header
        const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

        console.log('Token from cookies:', req.cookies?.token);
        console.log('Token from headers:', req.headers.authorization);
        console.log('Final token:', token);

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = verifyToken(token);
        console.log('Decoded token:', decoded);

        if (!decoded) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Verify user still exists
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true }
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(401).json({ message: 'Authentication failed' });
    }
}
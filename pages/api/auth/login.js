import { prisma } from '../../../lib/db';
import { verifyPassword, generateToken } from '../../../lib/auth';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = generateToken(user.id);

        // Set HTTP-only cookie
        const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
        const secure = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';

        res.setHeader('Set-Cookie', [
            `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax; ${secure}`
        ]);

        console.log('Setting cookie with token:', token.substring(0, 20) + '...');

        // Return user data (without password)
        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({
            message: 'Login successful',
            user: userWithoutPassword,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12);
};

export const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = (userId) => {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }
    
    const token = jwt.sign({ userId }, secret, { expiresIn: '7d' });
    return token;
};

export const verifyToken = (token) => {
    try {
        const secret = process.env.JWT_SECRET;
        
        if (!secret) {
            return null;
        }
        
        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch (error) {
        return null;
    }
};

export const verifyTokenEdge = async (token) => {
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret || !token) {
            return null;
        }

        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const [payload] = parts;
        
        const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        
        if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
            return null;
        }

        return decodedPayload;
    } catch (error) {
        return null;
    }
};

export const getTokenFromRequest = (req) => {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    return token;
};
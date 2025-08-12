import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

export function middleware(request) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // Public paths that don't require authentication
    const publicPaths = ['/login', '/api/auth/login', '/api/auth/check'];

    // Allow public paths and static files
    if (publicPaths.includes(pathname) ||
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/api/auth/') ||
        pathname.includes('.')) {
        return NextResponse.next();
    }

    // Check if user is authenticated
    if (!token) {
        console.log('No token found, redirecting to login');
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        console.log('Invalid token, redirecting to login');
        // Clear invalid token
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.set('token', '', { maxAge: 0 });
        return response;
    }

    // Add user ID to headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
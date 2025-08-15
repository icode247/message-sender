import { NextResponse } from 'next/server';

async function verifyTokenEdge(token) {
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret || !token) {
            return null;
        }

        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const [header, payload, signature] = parts;
        
        const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        
        if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
            return null;
        }
        
        return decodedPayload;
    } catch (error) {
        return null;
    }
}

export async function middleware(request) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    const publicPaths = ['/login', '/api/auth/login', '/api/auth/logout'];
    
    if (publicPaths.includes(pathname) ||
        pathname.startsWith('/_next/') ||
        pathname.includes('.') ||
        pathname.startsWith('/api/auth/')) {
        return NextResponse.next();
    }

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const decoded = await verifyTokenEdge(token);
    if (!decoded) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.set('token', '', { maxAge: 0 });
        return response;
    }

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
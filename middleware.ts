import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken'; // Or import jwt from 'jsonwebtoken' and use jwt.verify

const JWT_SECRET = process.env.JWT_SECRET;

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('sessionToken')?.value;
  // const { pathname } = request.nextUrl; // Not needed if matcher is specific enough

  if (!sessionToken) {
    // Redirect to login if trying to access admin routes without a token
    // Since the matcher ensures this only runs for /admin paths, this is correct.
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    if (!JWT_SECRET) {
      // This case should ideally not happen if environment variables are set up correctly
      console.error('JWT_SECRET is not defined in middleware');
      // Redirect to login as a fallback, or handle as a server error
      return NextResponse.redirect(new URL('/auth/login?error=server_config_issue', request.url));
    }
    // Adjust payload type as per your actual JWT structure
    const decoded = verify(sessionToken, JWT_SECRET) as { userId: string; role: string; [key: string]: any };

    if (decoded.role !== 'admin') {
      // Redirect to a suitable page if not admin
      // Redirecting to /feed, assuming it's a general authenticated page
      return NextResponse.redirect(new URL('/feed', request.url));
    }

    return NextResponse.next(); // Allow access if admin
  } catch (error) {
    console.error('Middleware verification error:', error);
    // Invalid token (expired, malformed, etc.), redirect to login
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    // Clear the invalid cookie
    response.cookies.set('sessionToken', '', { maxAge: 0, path: '/' });
    return response;
  }
}

export const config = {
  // Apply this middleware to routes starting with /admin/
  matcher: ['/admin/:path*'],
};

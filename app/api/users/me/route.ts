import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken'; // Using direct import for verify

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get('sessionToken')?.value;

  if (!sessionToken) {
    return NextResponse.json({ message: 'Authentication required. No session token provided.' }, { status: 401 });
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not defined. Cannot verify session token.');
    return NextResponse.json({ message: 'Server configuration error.' }, { status: 500 });
  }

  try {
    // The decoded type should match the actual structure of your JWT payload
    const decoded = verify(sessionToken, JWT_SECRET) as { userId: number; name: string; email: string; role: string; iat: number; exp: number };
    
    // We want to return a subset of the user details, specifically including role
    // And ensuring we don't return sensitive parts of the token itself like iat or exp
    const userDetails = {
      id: decoded.userId, // Assuming your JWT payload uses userId
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };

    return NextResponse.json(userDetails, { status: 200 });

  } catch (error) {
    console.error('JWT Verification Error:', error);
    // Differentiate between error types if needed, e.g., TokenExpiredError, JsonWebTokenError
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return NextResponse.json({ message: 'Session expired. Please log in again.' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Invalid session token. Authentication failed.' }, { status: 401 });
  }
}

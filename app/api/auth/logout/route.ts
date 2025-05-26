import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export async function POST() { // Changed to POST as per preference, removed unused request parameter
  // Clear the sessionToken cookie
  const cookie = serialize('sessionToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Ensure this matches the login route's setting
    maxAge: 0, // Setting maxAge to 0 expires the cookie immediately
    path: '/', // Ensure this matches the login route's setting
  });

  return NextResponse.json(
    { message: 'Logout successful' },
    {
      status: 200,
      headers: { 'Set-Cookie': cookie },
    }
  );
}

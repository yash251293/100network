import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import bcrypt from 'bcryptjs'; // Corrected import
import { sign } from 'jsonwebtoken';
import { serialize } from 'cookie';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }), // Password should not be empty
});

export async function POST(request: NextRequest) {
  let db;
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Validation failed", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, password } = validation.data;

    db = await getDbConnection();

    // Fetch user by email
    const user = await db.get('SELECT id, email, name, password_hash, role FROM users WHERE email = ?', email);

    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 }); // User not found
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 }); // Password mismatch
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables.');
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }

    try {
      console.log("User object from DB:", user); // ADDED FOR DEBUGGING
      const payloadToSign = { userId: user.id, email: user.email, name: user.name, role: user.role };
      console.log("JWT payload being signed:", payloadToSign); // ADDED FOR DEBUGGING
      const token = sign(
        payloadToSign, // Use the new constant here
        jwtSecret,
        { expiresIn: '1d' } // 1 day expiration
      );

      const cookie = serialize('sessionToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Or 'strict'
        maxAge: 60 * 60 * 24 * 1, // 1 day in seconds
        path: '/',
      });

      return NextResponse.json(
        { message: 'Login successful' },
        {
          status: 200,
          headers: { 'Set-Cookie': cookie },
        }
      );
    } catch (jwtError) {
      console.error('JWT signing error:', jwtError);
      return NextResponse.json({ message: 'Failed to create session' }, { status: 500 });
    }

  } catch (error) {
    console.error('Login error:', error);
    // Check if it's a Zod validation error for a more specific message if needed
    if (error instanceof z.ZodError) {
        return NextResponse.json({ message: "Validation error", errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
  // finally {
  //    // Optional: closeDbConnection();
  // }
}

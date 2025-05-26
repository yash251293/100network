import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import bcrypt from 'bcryptjs'; // Corrected import
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  name: z.string().min(1, { message: "Name is required" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
});

export async function POST(request: NextRequest) {
  let db;
  try {
    const body = await request.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Validation failed", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, name, password } = validation.data;

    db = await getDbConnection();

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Store user
    const result = await db.run(
      'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)',
      email,
      name,
      passwordHash,
      'user' // Explicitly set role
    );

    if (!result.lastID) {
      return NextResponse.json({ message: 'Failed to register user' }, { status: 500 });
    }

    // Return user data (excluding password hash)
    return NextResponse.json({
      id: result.lastID,
      email,
      name,
      role: 'user', // Include role in response
      message: 'User registered successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    // Check if it's a Zod validation error for a more specific message if needed, though handled above.
    if (error instanceof z.ZodError) {
        return NextResponse.json({ message: "Validation error", errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
  // finally {
  //   // Optional: closeDbConnection(); but generally not recommended here for serverless functions
  //   // unless specific resource management is critical per request.
  // }
}

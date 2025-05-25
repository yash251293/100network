import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import bcrypt from 'bcryptjs'; // Corrected import
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
    const user = await db.get('SELECT id, email, name, password_hash FROM users WHERE email = ?', email);

    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 }); // User not found
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 }); // Password mismatch
    }

    // For now, returning user information (excluding password hash)
    // In a real application, you would generate and return a session token (e.g., JWT)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      message: 'Login successful'
      // token: "mock-jwt-token" // Example of where a token might go
    }, { status: 200 });

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

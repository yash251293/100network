import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { z } from 'zod';

// GET Handler to fetch user profile
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;

  if (!userId || isNaN(parseInt(userId))) {
    return NextResponse.json({ message: 'Valid User ID is required' }, { status: 400 });
  }

  let db;
  try {
    db = await getDbConnection();
    const user = await db.get(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?',
      parseInt(userId)
    );

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });

  } catch (error) {
    console.error(`Failed to fetch profile for user ${userId}:`, error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
  // finally {
  //   // Optional: await closeDbConnection(); // Usually not closed per request in serverless
  // }
}

// PUT Handler to update user profile
const updateUserSchema = z.object({
  name: z.string().min(1, { message: "Name cannot be empty" }).optional(),
  email: z.string().email({ message: "Invalid email address" }).optional(),
}).refine(data => data.name || data.email, {
  message: "Either name or email must be provided for update",
  path: ["name", "email"], // Path to highlight if this refinement fails
});

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;

  if (!userId || isNaN(parseInt(userId))) {
    return NextResponse.json({ message: 'Valid User ID is required' }, { status: 400 });
  }

  const parsedUserId = parseInt(userId);
  let db;

  try {
    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Validation failed", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, email } = validation.data;

    if (!name && !email) {
        // This case should ideally be caught by refine, but as a safeguard:
        return NextResponse.json({ message: 'No fields provided for update.' }, { status: 400 });
    }

    db = await getDbConnection();

    // Check if user exists
    const currentUser = await db.get('SELECT id, email FROM users WHERE id = ?', parsedUserId);
    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Check for email conflict if email is being updated
    if (email && email !== currentUser.email) {
      const existingUserWithNewEmail = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', email, parsedUserId);
      if (existingUserWithNewEmail) {
        return NextResponse.json({ message: 'This email address is already in use by another account.' }, { status: 409 });
      }
    }

    // Build the update query
    const updateFields: string[] = [];
    const values: (string | number)[] = [];

    if (name) {
      updateFields.push('name = ?');
      values.push(name);
    }
    if (email) {
      updateFields.push('email = ?');
      values.push(email);
    }
    
    // The trigger 'update_users_updated_at' should automatically handle 'updated_at'
    // So, no need to manually set it here.

    if (updateFields.length === 0) {
      // Should not happen due to Zod validation, but good to have a check
      return NextResponse.json({ message: 'No valid fields to update' }, { status: 400 });
    }

    const sqlQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    values.push(parsedUserId);

    const result = await db.run(sqlQuery, ...values);

    if (result.changes === 0) {
      // This might happen if the provided data is the same as the existing data,
      // or if the user ID was valid but somehow the update didn't take.
      // For now, we'll assume it means no actual change was needed or an issue occurred.
      // Fetching the user again to return current state.
      const updatedUserNoChange = await db.get(
        'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?',
        parsedUserId
      );
      return NextResponse.json(updatedUserNoChange, { status: 200 });
    }
    
    // Fetch the updated user data (excluding password hash)
    const updatedUser = await db.get(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?',
      parsedUserId
    );

    return NextResponse.json(updatedUser, { status: 200 });

  } catch (error: any) {
    console.error(`Failed to update profile for user ${userId}:`, error);
    if (error.message && error.message.includes("UNIQUE constraint failed: users.email")) {
        return NextResponse.json({ message: 'This email address is already in use.' }, { status: 409 });
    }
    if (error instanceof z.ZodError) { // Should be caught by validation.success check
        return NextResponse.json({ message: "Validation error", errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
  // finally {
  //   // Optional: await closeDbConnection();
  // }
}

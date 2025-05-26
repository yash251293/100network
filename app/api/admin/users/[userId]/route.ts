import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDbConnection, closeDbConnection } from '@/lib/db'; // Using closeDbConnection from lib/db
import { Statement } from 'sqlite'; // Import Statement type for prepared statements

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const targetUserIdStr = params.userId;
  const targetUserId = parseInt(targetUserIdStr, 10);

  if (isNaN(targetUserId)) {
    return NextResponse.json({ message: 'Invalid user ID format.' }, { status: 400 });
  }

  try {
    const sessionToken = request.cookies.get('sessionToken')?.value;
    if (!sessionToken) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    let decoded: any; // Consider defining a type for the decoded token payload
    try {
      decoded = jwt.verify(sessionToken, process.env.JWT_SECRET as string);
    } catch (error) {
      // Differentiate between token expiration and other verification errors if needed
      if (error instanceof jwt.TokenExpiredError) {
        return NextResponse.json({ message: 'Token expired' }, { status: 401 });
      }
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // Assuming JWT payload has 'id' (number) and 'role' (string)
    if (typeof decoded.id !== 'number' || typeof decoded.role !== 'string') {
        console.error('Token payload is malformed:', decoded);
        return NextResponse.json({ message: 'Invalid token payload' }, { status: 401 });
    }
    
    if (decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Admin role required' }, { status: 403 });
    }

    const adminUserId = decoded.id;
    if (adminUserId === targetUserId) {
      return NextResponse.json({ message: 'Admins cannot delete themselves.' }, { status: 400 });
    }

    const db = await getDbConnection();
    let stmt: Statement | undefined = undefined; // Define stmt here to be accessible in finally for finalize

    try {
      // Using await for prepare and run as getDbConnection returns a Promise<Database>
      stmt = await db.prepare('DELETE FROM users WHERE id = ?');
      const result = await stmt.run(targetUserId);

      if (result.changes === 0) {
        return NextResponse.json({ message: 'User not found.' }, { status: 404 });
      }

      return NextResponse.json({ message: 'User deleted successfully.' }, { status: 200 });

    } finally {
      if (stmt) {
        await stmt.finalize(); // Finalize the statement
      }
    }

  } catch (error) {
    console.error('Failed to delete user:', error);
    if (error instanceof jwt.JsonWebTokenError) { 
        return NextResponse.json({ message: 'Token processing error.' }, { status: 401 });
    }
    // Add more specific error checks if necessary, e.g., for database errors
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  } finally {
    // closeDbConnection is available from lib/db.ts and handles the db instance itself
    await closeDbConnection(); 
  }
}

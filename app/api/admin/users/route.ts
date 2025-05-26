import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDbConnection } from '@/lib/db';

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get('sessionToken')?.value;

  if (!sessionToken) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET as string) as { userId: string; role: string };

    if (decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
      const db = getDbConnection();
      const users = db.prepare('SELECT id, name, email, role, created_at FROM users').all();
      db.close(); // Close the database connection

      return NextResponse.json({ users }, { status: 200 });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ message: 'Error fetching users' }, { status: 500 });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }
}

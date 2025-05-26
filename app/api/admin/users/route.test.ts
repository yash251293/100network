import { GET } from './route'; // Adjust the import path as necessary
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDbConnection } from '@/lib/db'; // Assuming this is the correct path

// Mocking jsonwebtoken
jest.mock('jsonwebtoken');
const mockedJwtVerify = jwt.verify as jest.Mock;

// Mocking lib/db
jest.mock('@/lib/db');
const mockedGetDbConnection = getDbConnection as jest.Mock;

// Helper to create a mock NextRequest
function createMockRequest(cookies?: Record<string, string>, headers?: Record<string, string>, body?: any): NextRequest {
  const request = new Map(Object.entries(headers || {}));
  const cookieStore = new Map(Object.entries(cookies || {}));
  
  return {
    headers: request,
    cookies: {
      get: (key: string) => {
        const value = cookieStore.get(key);
        return value ? { name: key, value } : undefined;
      },
      // Add other methods if your code uses them
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
      clear: jest.fn(),
      getAll: jest.fn(),
    },
    nextUrl: new URL('http://localhost/api/admin/users'), // Base URL, path will be derived
    json: async () => body,
    // Add other properties/methods if your handler uses them (e.g., text(), formData())
  } as unknown as NextRequest;
}

// Define a dummy JWT_SECRET for tests if not set in environment
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('GET /api/admin/users', () => {
  let mockDb: any;

  beforeEach(() => {
    // Reset mocks before each test
    mockedJwtVerify.mockReset();
    mockedGetDbConnection.mockReset();

    // Setup default mock for db connection
    mockDb = {
      prepare: jest.fn().mockReturnThis(),
      all: jest.fn(),
      close: jest.fn(),
    };
    mockedGetDbConnection.mockReturnValue(mockDb);
  });

  test('should return 401 if no session token is provided', async () => {
    const request = createMockRequest(); // No cookies
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Authentication required');
  });

  test('should return 401 if token verification fails (invalid token)', async () => {
    mockedJwtVerify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const request = createMockRequest({ sessionToken: 'invalid-token' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Invalid token');
    expect(mockedJwtVerify).toHaveBeenCalledWith('invalid-token', process.env.JWT_SECRET);
  });

  test('should return 403 if user is not an admin', async () => {
    mockedJwtVerify.mockReturnValue({ userId: '1', role: 'user' }); // Non-admin user

    const request = createMockRequest({ sessionToken: 'valid-user-token' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toBe('Forbidden');
    expect(mockedJwtVerify).toHaveBeenCalledWith('valid-user-token', process.env.JWT_SECRET);
  });

  test('should return 200 and user data for admin user', async () => {
    const mockUsers = [
      { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'admin', created_at: new Date().toISOString() },
      { id: 2, name: 'Regular User', email: 'user@example.com', role: 'user', created_at: new Date().toISOString() },
    ];
    mockedJwtVerify.mockReturnValue({ userId: '1', role: 'admin' });
    mockDb.all.mockReturnValue(mockUsers); // Mock the database response

    const request = createMockRequest({ sessionToken: 'valid-admin-token' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toEqual(mockUsers);
    expect(mockedJwtVerify).toHaveBeenCalledWith('valid-admin-token', process.env.JWT_SECRET);
    expect(mockedGetDbConnection).toHaveBeenCalled();
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id, name, email, role, created_at FROM users');
    expect(mockDb.all).toHaveBeenCalled();
    expect(mockDb.close).toHaveBeenCalled();
  });
  
  test('should return 500 if database query fails', async () => {
    mockedJwtVerify.mockReturnValue({ userId: '1', role: 'admin' });
    mockDb.all.mockImplementation(() => { // Simulate a database error
      throw new Error('Database query failed');
    });

    const request = createMockRequest({ sessionToken: 'valid-admin-token' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe('Error fetching users');
    expect(mockedGetDbConnection).toHaveBeenCalled();
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id, name, email, role, created_at FROM users');
    expect(mockDb.all).toHaveBeenCalled();
    // Depending on implementation, close might still be called in a finally block or not if error happens before
    // For this test, we are checking that the error is handled correctly *before* close might be called or not.
  });

  test('should return 401 if JWT_SECRET is not defined', async () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET; // Temporarily remove JWT_SECRET

    const request = createMockRequest({ sessionToken: 'any-token' });
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(401); // Or 500, depending on desired behavior for misconfiguration
    expect(data.message).toBe('Invalid token'); // This is what the current code returns

    process.env.JWT_SECRET = originalSecret; // Restore JWT_SECRET
  });

});

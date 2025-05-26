import { DELETE } from './route';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDbConnection, closeDbConnection } from '@/lib/db'; // Import closeDbConnection as it's used directly

// Mock 'jsonwebtoken'
jest.mock('jsonwebtoken');
const mockedJwtVerify = jwt.verify as jest.Mock;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;


// Mock '@/lib/db'
jest.mock('@/lib/db');
const mockedGetDbConnection = getDbConnection as jest.Mock;
const mockedCloseDbConnection = closeDbConnection as jest.Mock; // Mock closeDbConnection

// Helper to create mock request
// The route handler receives params directly as its second argument,
// so the request mock primarily needs to handle cookies.
function createMockRequest(cookies?: Record<string, string>): NextRequest {
  const cookieStore = new Map(Object.entries(cookies || {}));
  return {
    cookies: {
      get: (key: string) => {
        const value = cookieStore.get(key);
        return value !== undefined ? { name: key, value } : undefined;
      },
    },
    // Add other NextRequest properties if they become necessary
  } as NextRequest;
}

describe('DELETE /api/admin/users/[userId]', () => {
  let mockDb: any;
  let mockStmt: any;

  beforeEach(() => {
    jest.resetAllMocks(); // Reset all mocks before each test

    // Setup mock statement
    mockStmt = {
      run: jest.fn(),
      finalize: jest.fn().mockResolvedValue(undefined), // finalize is async in the code
    };

    // Setup mock DB connection
    mockDb = {
      prepare: jest.fn().mockResolvedValue(mockStmt), // prepare is async
      // close is not part of the db object returned by getDbConnection based on lib/db.ts,
      // it's a separate function, so we use mockedCloseDbConnection
    };
    mockedGetDbConnection.mockResolvedValue(mockDb); // getDbConnection is async

    // Ensure JWT_SECRET is available for tests
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(async () => {
    // Verify that db connection is closed if it was opened
    if (mockedGetDbConnection.mock.calls.length > 0) {
        // For tests that don't reach db interaction, close won't be called.
        // For tests that do, it should be.
        // If a test expects closeDbConnection to be called, it should assert it.
        // This is a general cleanup check.
    }
  });

  test('should successfully delete a user as admin (200 OK)', async () => {
    mockedJwtVerify.mockReturnValue({ id: 1, role: 'admin' });
    mockStmt.run.mockResolvedValue({ changes: 1 }); // Simulate successful deletion

    const request = createMockRequest({ sessionToken: 'valid-admin-token' });
    const context = { params: { userId: '2' } };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('User deleted successfully.');
    expect(mockedGetDbConnection).toHaveBeenCalledTimes(1);
    expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM users WHERE id = ?');
    expect(mockStmt.run).toHaveBeenCalledWith(2); // Ensure ID is passed as number
    expect(mockStmt.finalize).toHaveBeenCalledTimes(1);
    expect(mockedCloseDbConnection).toHaveBeenCalledTimes(1);
  });

  test('should return 401 if no session token is provided', async () => {
    const request = createMockRequest({}); // No sessionToken
    const context = { params: { userId: '2' } };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Authentication required');
    expect(mockedGetDbConnection).not.toHaveBeenCalled();
    expect(mockedCloseDbConnection).not.toHaveBeenCalled(); // Connection not opened
  });

  test('should return 401 if token is invalid (jwt.verify throws generic error)', async () => {
    mockedJwtVerify.mockImplementation(() => {
      throw new jwt.JsonWebTokenError('Invalid token');
    });

    const request = createMockRequest({ sessionToken: 'invalid-token' });
    const context = { params: { userId: '2' } };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Invalid token');
    expect(mockedGetDbConnection).not.toHaveBeenCalled();
    expect(mockedCloseDbConnection).not.toHaveBeenCalled();
  });

  test('should return 401 if token is expired (jwt.verify throws TokenExpiredError)', async () => {
    mockedJwtVerify.mockImplementation(() => {
      throw new jwt.TokenExpiredError('Token expired', new Date());
    });

    const request = createMockRequest({ sessionToken: 'expired-token' });
    const context = { params: { userId: '2' } };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Token expired');
    expect(mockedGetDbConnection).not.toHaveBeenCalled();
    expect(mockedCloseDbConnection).not.toHaveBeenCalled();
  });
  
  test('should return 401 if token payload is malformed (e.g. missing id)', async () => {
    mockedJwtVerify.mockReturnValue({ role: 'admin' }); // Missing id

    const request = createMockRequest({ sessionToken: 'malformed-payload-token' });
    const context = { params: { userId: '2' } };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Invalid token payload');
    expect(mockedGetDbConnection).not.toHaveBeenCalled();
    expect(mockedCloseDbConnection).not.toHaveBeenCalled();
  });


  test('should return 403 if user is not an admin', async () => {
    mockedJwtVerify.mockReturnValue({ id: 1, role: 'user' }); // Not an admin

    const request = createMockRequest({ sessionToken: 'user-token' });
    const context = { params: { userId: '2' } };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toBe('Forbidden: Admin role required');
    expect(mockedGetDbConnection).not.toHaveBeenCalled();
    expect(mockedCloseDbConnection).not.toHaveBeenCalled();
  });

  test('should return 400 if admin tries to delete themselves', async () => {
    mockedJwtVerify.mockReturnValue({ id: 1, role: 'admin' }); // Admin ID is 1

    const request = createMockRequest({ sessionToken: 'admin-token' });
    const context = { params: { userId: '1' } }; // Trying to delete self

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Admins cannot delete themselves.');
    expect(mockedGetDbConnection).not.toHaveBeenCalled();
    expect(mockedCloseDbConnection).not.toHaveBeenCalled();
  });

  test('should return 404 if user to delete is not found', async () => {
    mockedJwtVerify.mockReturnValue({ id: 1, role: 'admin' });
    mockStmt.run.mockResolvedValue({ changes: 0 }); // No user found/deleted

    const request = createMockRequest({ sessionToken: 'admin-token' });
    const context = { params: { userId: '99' } }; // Non-existent user

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('User not found.');
    expect(mockedGetDbConnection).toHaveBeenCalledTimes(1);
    expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM users WHERE id = ?');
    expect(mockStmt.run).toHaveBeenCalledWith(99);
    expect(mockStmt.finalize).toHaveBeenCalledTimes(1);
    expect(mockedCloseDbConnection).toHaveBeenCalledTimes(1);
  });

  test('should return 500 if database run operation fails', async () => {
    mockedJwtVerify.mockReturnValue({ id: 1, role: 'admin' });
    mockStmt.run.mockRejectedValue(new Error('DB run error')); // Simulate DB error

    const request = createMockRequest({ sessionToken: 'admin-token' });
    const context = { params: { userId: '2' } };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe('An internal server error occurred.');
    expect(mockedGetDbConnection).toHaveBeenCalledTimes(1);
    expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM users WHERE id = ?');
    expect(mockStmt.run).toHaveBeenCalledWith(2);
    expect(mockStmt.finalize).toHaveBeenCalledTimes(1); // finalize should still be called
    expect(mockedCloseDbConnection).toHaveBeenCalledTimes(1);
  });
  
  test('should return 500 if database prepare operation fails', async () => {
    mockedJwtVerify.mockReturnValue({ id: 1, role: 'admin' });
    mockDb.prepare.mockRejectedValue(new Error('DB prepare error')); // Simulate DB prepare error

    const request = createMockRequest({ sessionToken: 'admin-token' });
    const context = { params: { userId: '2' } };

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe('An internal server error occurred.');
    expect(mockedGetDbConnection).toHaveBeenCalledTimes(1);
    expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM users WHERE id = ?');
    // mockStmt.run and finalize will not be called if prepare fails
    expect(mockStmt.run).not.toHaveBeenCalled(); 
    expect(mockStmt.finalize).not.toHaveBeenCalled();
    expect(mockedCloseDbConnection).toHaveBeenCalledTimes(1);
  });

  test('should return 400 if userId parameter is not a valid number', async () => {
    const request = createMockRequest({ sessionToken: 'admin-token' });
    const context = { params: { userId: 'abc' } }; // Invalid userId

    const response = await DELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Invalid user ID format.');
    expect(mockedGetDbConnection).not.toHaveBeenCalled();
    expect(mockedCloseDbConnection).not.toHaveBeenCalled();
  });
});

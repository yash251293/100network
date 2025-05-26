import { GET } from './route'; // Adjust if your file structure is different
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Mocking jsonwebtoken
jest.mock('jsonwebtoken');
const mockedJwtVerify = jwt.verify as jest.Mock;

// Helper to create a mock NextRequest (can be shared or adapted from other test files)
function createMockRequest(cookies?: Record<string, string>, headers?: Record<string, string>): NextRequest {
  const requestHeaders = new Map(Object.entries(headers || {}));
  const cookieStore = new Map(Object.entries(cookies || {}));

  return {
    headers: requestHeaders,
    cookies: {
      get: (key: string) => {
        const value = cookieStore.get(key);
        return value ? { name: key, value } : undefined;
      },
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
      clear: jest.fn(),
      getAll: jest.fn(),
    },
    nextUrl: new URL('http://localhost/api/users/me'), // Base URL
    json: async () => ({}), // Default empty body for GET, not typically used
  } as unknown as NextRequest;
}

// Ensure JWT_SECRET is defined for tests, falling back to a default
// This should ideally be managed by jest.setup.js loading .env.test
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-me-route';

describe('GET /api/users/me', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockedJwtVerify.mockReset();
  });

  test('should return 401 if no session token is provided', async () => {
    const request = createMockRequest(); // No cookies
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Authentication required. No session token provided.');
  });

  test('should return 401 if token verification fails (generic error)', async () => {
    mockedJwtVerify.mockImplementation(() => {
      throw new Error('Some JWT error');
    });

    const request = createMockRequest({ sessionToken: 'invalid-token' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Invalid session token. Authentication failed.');
    expect(mockedJwtVerify).toHaveBeenCalledWith('invalid-token', process.env.JWT_SECRET);
  });

  test('should return 401 if token is expired', async () => {
    const error = new Error('Token expired') as any; // Cast to any to add name property
    error.name = 'TokenExpiredError';
    mockedJwtVerify.mockImplementation(() => {
      throw error;
    });

    const request = createMockRequest({ sessionToken: 'expired-token' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Session expired. Please log in again.');
    expect(mockedJwtVerify).toHaveBeenCalledWith('expired-token', process.env.JWT_SECRET);
  });

  test('should return 200 and user details for a valid token', async () => {
    const mockDecodedPayload = {
      userId: 123,
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    mockedJwtVerify.mockReturnValue(mockDecodedPayload);

    const request = createMockRequest({ sessionToken: 'valid-token' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: mockDecodedPayload.userId,
      name: mockDecodedPayload.name,
      email: mockDecodedPayload.email,
      role: mockDecodedPayload.role,
    });
    expect(mockedJwtVerify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
  });

  test('should return 500 if JWT_SECRET is not defined', async () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET; // Temporarily remove JWT_SECRET for this test

    const request = createMockRequest({ sessionToken: 'any-token' });
    const response = await GET(request);
    const data = await response.json();
    
    // As per the implementation of app/api/users/me/route.ts
    expect(response.status).toBe(500); 
    expect(data.message).toBe('Server configuration error.');

    process.env.JWT_SECRET = originalSecret; // Restore JWT_SECRET
  });
});

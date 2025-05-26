/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import AdminUsersPage from './page'; // Assuming 'page.tsx' is in the same directory
import '@testing-library/jest-dom';

// Mock global fetch
global.fetch = jest.fn();

const mockUsers = [
  { id: 1, name: 'Alice Wonderland', email: 'alice@example.com', role: 'admin', created_at: new Date().toISOString() },
  { id: 2, name: 'Bob The Builder', email: 'bob@example.com', role: 'user', created_at: new Date().toISOString() },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'user', created_at: new Date().toISOString() },
];

describe('AdminUsersPage', () => {
  beforeEach(() => {
    // Clear mock calls and implementations before each test
    (fetch as jest.Mock).mockClear();
    // Default mock implementation for fetch to avoid unresolved promises if not specifically set
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ users: [] }), // Default to no users
    });
  });

  test('shows loading state initially', () => {
    (fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {})); // Simulate fetch never resolving
    render(<AdminUsersPage />);
    expect(screen.getByText(/loading users.../i)).toBeInTheDocument();
  });

  test('shows error message on fetch failure (network error)', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'));
    render(<AdminUsersPage />);
    // Wait for the error message to appear
    expect(await screen.findByText(/error: network request failed/i)).toBeInTheDocument();
  });

  test('shows error message when response is not ok (server error)', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ message: 'Server error occurred' }),
    });
    render(<AdminUsersPage />);
    expect(await screen.findByText(/error: server error occurred/i)).toBeInTheDocument();
  });
  
  test('shows error message when response is ok but data.users is not an array', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: "not an array" }), // Invalid data structure
    });
    render(<AdminUsersPage />);
    expect(await screen.findByText(/error: fetched data is not in the expected format./i)).toBeInTheDocument();
  });

  test('shows "No users found." when fetch returns empty user list', async () => {
    // Default mock already handles this, but being explicit for the test's purpose
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: [] }),
    });
    render(<AdminUsersPage />);
    expect(await screen.findByText(/no users found./i)).toBeInTheDocument();
  });

  test('displays user data in a table when fetch is successful', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: mockUsers }),
    });
    render(<AdminUsersPage />);

    // Wait for the table to be populated
    // Check for a specific user's name to ensure data is rendered
    expect(await screen.findByText(mockUsers[0].name)).toBeInTheDocument();
    expect(screen.getByText(mockUsers[1].email)).toBeInTheDocument();
    expect(screen.getByText(mockUsers[2].role)).toBeInTheDocument();

    // Check for table headers
    expect(screen.getByRole('columnheader', { name: /id/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /created at/i })).toBeInTheDocument();

    // Check number of data rows (excluding header row)
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(mockUsers.length + 1); // +1 for the header row
  });

  test('displays formatted date for created_at', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [mockUsers[0]] }), // Use only one user for simplicity
    });
    render(<AdminUsersPage />);
    
    const expectedDate = new Date(mockUsers[0].created_at).toLocaleDateString();
    expect(await screen.findByText(expectedDate)).toBeInTheDocument();
  });
});

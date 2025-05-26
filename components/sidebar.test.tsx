/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import Sidebar from './sidebar'; // Assuming sidebar.tsx is in the same directory
import '@testing-library/jest-dom';
import { useUser } from '@/hooks/use-user'; // Import the original to define the mock type

// Mock the custom hook
jest.mock('@/hooks/use-user');
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/feed'), // Default mock path, can be overridden per test if needed
}));

describe('Sidebar Component - Conditional Admin Link', () => {
  // Helper to assert standard links are present
  const expectStandardLinksPresent = () => {
    expect(screen.getByRole('link', { name: /explore/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /feed/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /inbox/i })).toBeInTheDocument();
    // Add more standard links if necessary to check
  };

  beforeEach(() => {
    // Reset mocks before each test if needed, though useUser is set per test.
    // usePathname is globally mocked but can be changed per test if required:
    // (require('next/navigation').usePathname as jest.Mock).mockReturnValue('/new-path');
  });

  test('Admin link NOT visible when user is loading', () => {
    mockUseUser.mockReturnValue({ user: null, loading: true, error: null });
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
    expectStandardLinksPresent();
  });

  test('Admin link NOT visible when there is an error fetching user', () => {
    mockUseUser.mockReturnValue({ user: null, loading: false, error: 'Failed to fetch' });
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
    expectStandardLinksPresent();
  });

  test('Admin link NOT visible when user is authenticated but NOT an admin', () => {
    mockUseUser.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'user@example.com', role: 'user' },
      loading: false,
      error: null,
    });
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
    expectStandardLinksPresent();
  });

  test('Admin link IS visible when user is authenticated AND is an admin', () => {
    mockUseUser.mockReturnValue({
      user: { id: '2', name: 'Admin User', email: 'admin@example.com', role: 'admin' },
      loading: false,
      error: null,
    });
    render(<Sidebar />);
    const adminLink = screen.getByRole('link', { name: /admin/i });
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute('href', '/admin/users');
    expectStandardLinksPresent();
  });
  
  test('Admin link NOT visible when useUser returns null for user (e.g. not logged in)', () => {
    mockUseUser.mockReturnValue({ user: null, loading: false, error: null });
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
    expectStandardLinksPresent();
  });

});

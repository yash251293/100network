'use client';

import { useState, useEffect } from 'react';

interface UserData {
  id: string | number; // Matches the API response which uses number for id
  name: string;
  email: string;
  role: string;
}

export function useUser() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError(null); // Reset error state on new fetch attempt
      try {
        const response = await fetch('/api/users/me');
        
        if (!response.ok) {
          let errorMessage = `Error: ${response.status} ${response.statusText}`;
          try {
            // Attempt to parse error details from the response body
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // If response body is not JSON or other parsing error, stick with the status code error
            console.warn('Could not parse error response JSON:', e);
          }
          throw new Error(errorMessage);
        }
        
        const data: UserData = await response.json();
        setUser(data);
        // setError(null); // Already set at the beginning of try
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('useUser fetch error:', message);
        setError(message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []); // Empty dependency array ensures this runs once on mount

  return { user, loading, error };
}

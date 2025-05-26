'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Trash2 } from "lucide-react"; // Added Trash2 for delete icon
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner"; // Using sonner for toasts

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null); // Reset error state on new fetch
      const response = await fetch('/api/admin/users');

        if (!response.ok) {
          let errorMessage = `Failed to fetch users: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (jsonError) {
            // If response is not JSON, use the initial error message
            console.warn('Response was not JSON:', jsonError);
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        // The API returns { users: User[] }, so access data.users
        if (data && Array.isArray(data.users)) {
          setUsers(data.users);
        } else {
          // Handle cases where data.users is not an array or data is not as expected
          console.error('Fetched data is not in the expected format:', data);
          setUsers([]); // Set to empty array or handle as an error
          throw new Error('Fetched data is not in the expected format.');
        }

      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Fetch error:", message);
        setError(message);
        setUsers([]); // Clear users on error
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId: number) => {
    if (!userToDelete || userId !== userToDelete.id) {
      toast.error("Selected user for deletion does not match. Please try again.");
      setUserToDelete(null); // Reset selection
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers(currentUsers => currentUsers.filter(user => user.id !== userId));
        toast.success(`User ${userToDelete.name} deleted successfully!`);
        setUserToDelete(null); // Close dialog on success
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to delete user.');
        // Keep dialog open on API error to allow retry or cancel
      }
    } catch (err) {
      console.error("Delete user error:", err);
      toast.error('An unexpected network error occurred. Please try again.');
      // Keep dialog open on network error
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard - Users</h1>
        <p>Loading users...</p>
      </div>
    );
  }

  if (error) {
    let title = "Error";
    let description = "An unexpected error occurred. Please try again later.";

    if (error.includes("401") || error.toLowerCase().includes("authentication required")) {
      title = "Authentication Error";
      description = "You must be logged in to view this page. Please try logging in again.";
    } else if (error.includes("403") || error.toLowerCase().includes("forbidden")) {
      title = "Access Denied";
      description = "You do not have permission to view this page.";
    } else if (error.toLowerCase().includes("failed to fetch") || error.toLowerCase().includes("network error")) {
      title = "Network Error";
      description = "Could not connect to the server. Please check your internet connection.";
    } else if (error.includes("Fetched data is not in the expected format")) {
      title = "Data Error";
      description = "Received unexpected data from the server. Please contact support.";
    }
    // else, the default "An unexpected error occurred" will be used.

    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard - Users</h1>
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard - Users</h1>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div className="overflow-x-auto shadow-md sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Created At</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" onClick={() => setUserToDelete(user)} disabled={isDeleting}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {userToDelete && (
        <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => { if (!isOpen) setUserToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user:
                <br /><strong>Name:</strong> {userToDelete.name}
                <br /><strong>Email:</strong> {userToDelete.email}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteUser(userToDelete.id)}
                disabled={isDeleting}
                className={buttonVariants({ variant: "destructive" })} // Ensure destructive style
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

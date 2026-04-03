import { useState } from 'react';
import { UserProfile } from '../types';
import { toast } from 'sonner';
import { auth } from '../firebase';

export function useUserManagement() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const getAuthHeader = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();
    return { 'Authorization': `Bearer ${token}` };
  };

  const createUser = async (userData: Partial<UserProfile> & { password?: string }) => {
    setIsProcessing(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create user');
      }
      toast.success('User created successfully');
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const updateUser = async (data: any) => {
    setIsProcessing(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update user');
      }
      toast.success('User updated successfully');
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteUser = async (uid: string, username?: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({ uid }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete user');
      }
      toast.success(`User ${username || ''} deleted successfully`);
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    error,
    clearError,
    createUser,
    updateUser,
    deleteUser
  };
}

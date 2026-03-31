import { useState } from 'react';
import { UserProfile } from '../types';
import { toast } from 'sonner';

export function useUserManagement() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const createUser = async (userData: Partial<UserProfile>) => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    const { uid, ...userData } = data;
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/update/${uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
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
      const response = await fetch(`/api/users/delete/${uid}`, {
        method: 'DELETE',
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

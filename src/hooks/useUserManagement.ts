import { useState } from 'react';
import { useAuth } from '../AuthProvider';
import { UserProfile, UserRole } from '../types';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export const useUserManagement = () => {
  const { user: currentUser, profile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callApi = async (endpoint: string, body: any) => {
    setIsProcessing(true);
    setError(null);
    try {
      const idToken = await currentUser?.getIdToken();
      const response = await fetch(`/api/admin/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(body)
      });

      const contentType = response.headers.get("content-type");
      let result;
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`);
      }

      if (!response.ok) throw new Error(result.error || `Failed to ${endpoint}`);
      
      return result;
    } catch (err: any) {
      console.error(`User management error (${endpoint}):`, err);
      setError(err.message || `An error occurred during ${endpoint}`);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const createUser = async (data: { email: string; username: string; role: UserRole; password?: string }) => {
    const result = await callApi('create-user', data);
    
    // Log the action
    await addDoc(collection(db, 'logs'), {
      userId: profile?.uid,
      username: profile?.username,
      action: `created user: ${data.username} (${data.email})`,
      timestamp: new Date().toISOString(),
    });

    return result;
  };

  const updateUser = async (data: { uid: string; email?: string; username?: string; role?: UserRole; password?: string }) => {
    const result = await callApi('update-user', data);

    // Log the action
    await addDoc(collection(db, 'logs'), {
      userId: profile?.uid,
      username: profile?.username,
      action: `updated user: ${data.username || data.uid}`,
      timestamp: new Date().toISOString(),
    });

    return result;
  };

  const deleteUser = async (uid: string, username: string) => {
    const result = await callApi('delete-user', { uid });

    // Log the action
    await addDoc(collection(db, 'logs'), {
      userId: profile?.uid,
      username: profile?.username,
      action: `deleted user: ${username}`,
      timestamp: new Date().toISOString(),
    });

    return result;
  };

  const syncUsers = async () => {
    const result = await callApi('sync-users', {});
    
    // Log the action
    await addDoc(collection(db, 'logs'), {
      userId: profile?.uid,
      username: profile?.username,
      action: `synced users from auth to firestore`,
      timestamp: new Date().toISOString(),
    });

    return result;
  };

  return {
    createUser,
    updateUser,
    deleteUser,
    syncUsers,
    isProcessing,
    error,
    clearError: () => setError(null)
  };
};

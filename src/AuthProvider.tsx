import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, UserRole } from './types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else if (firebaseUser.email === 'pasi@tillmax.co.uk') {
            // Auto-create profile for default admin if they managed to sign in
            console.log("Auto-creating profile for default admin:", firebaseUser.email);
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              username: 'System Admin',
              role: 'ADMIN',
              createdAt: new Date().toISOString(),
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
              console.log("Profile created successfully");
              setProfile(newProfile);
            } catch (err) {
              console.error("Failed to auto-create profile:", err);
              // If setDoc fails, it might be due to rules, but we should still try to set the profile locally if we know they are the admin
              // However, it's better to let the error bubble up or handle it in the UI
              setProfile(null);
            }
          } else {
            console.warn("User profile not found for UID:", firebaseUser.uid);
            setProfile(null);
          }
        } catch (error: any) {
          console.error("Failed to fetch user profile:", error);
          
          // Fallback for default admin even if getDoc fails (e.g. permission error before profile exists)
          if (firebaseUser.email === 'pasi@tillmax.co.uk') {
            console.log("Attempting fallback profile creation for admin after fetch failure");
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              username: 'System Admin',
              role: 'ADMIN',
              createdAt: new Date().toISOString(),
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
              setProfile(newProfile);
            } catch (setErr) {
              console.error("Fallback profile creation failed:", setErr);
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  };

  const logout = () => signOut(auth);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'ADMIN',
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

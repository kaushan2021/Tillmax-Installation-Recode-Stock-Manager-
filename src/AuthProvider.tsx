import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      } else {
        setLoading(true);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching user profile:", error);
      setProfile(null);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const isAdmin = profile?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

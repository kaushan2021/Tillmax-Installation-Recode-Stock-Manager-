import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { CompanySetting } from './types';

interface CompanyContextType {
  settings: CompanySetting | null;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  settings: null,
  loading: true,
});

export const useCompany = () => useContext(CompanyContext);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<CompanySetting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'companySettings', 'profile'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings({ id: docSnap.id, ...docSnap.data() } as CompanySetting);
      } else {
        setSettings(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching company settings:", error);
      setSettings(null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <CompanyContext.Provider value={{ settings, loading }}>
      {children}
    </CompanyContext.Provider>
  );
};

import React, { createContext, useContext } from 'react';
import { useUser } from '../hooks/useUser';
import { Profile } from '../types/database';

interface UserContextType {
  user: Profile | null;
  loading: boolean;
  setUser: (user: Profile | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const userData = useUser();
  return <UserContext.Provider value={userData}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}

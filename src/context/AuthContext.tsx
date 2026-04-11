'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AuthContextType {
  nurseName: string;
  nurseInitials: string;
  isAuthenticated: boolean;
  login: (employeeId: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  nurseName: '',
  nurseInitials: '',
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [nurseName, setNurseName] = useState('Nurse Sarah J.');
  const [nurseInitials, setNurseInitials] = useState('SJ');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = useCallback(async (_employeeId: string, _password: string) => {
    // Stub: accept any credentials for now
    setNurseName('Nurse Sarah J.');
    setNurseInitials('SJ');
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setNurseName('');
    setNurseInitials('');
  }, []);

  return (
    <AuthContext.Provider value={{ nurseName, nurseInitials, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

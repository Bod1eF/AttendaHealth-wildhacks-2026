'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { Nurse } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  nurse: Nurse | null;
  nurseName: string;
  nurseInitials: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (employeeId: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  nurse: null,
  nurseName: '',
  nurseInitials: '',
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [nurse, setNurse] = useState<Nurse | null>(null);
  const [nurseName, setNurseName] = useState('Nurse Sarah J.');
  const [nurseInitials, setNurseInitials] = useState('SJ');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate auth state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_nurse');
      if (stored) {
        const nurseData: Nurse = JSON.parse(stored);
        setNurse(nurseData);
        setNurseName(nurseData.name);
        const initials = nurseData.name
          .split(' ')
          .map((part) => part[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        setNurseInitials(initials);
        setIsAuthenticated(true);
      }
    } catch {
      localStorage.removeItem('auth_nurse');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (employeeId: string, _password: string) => {
    // Look up nurse by employee_id from Supabase
    const { data, error } = await supabase
      .from('nurses')
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    if (error || !data) {
      throw new Error('Invalid credentials');
    }

    const nurseData = data as Nurse;
    setNurse(nurseData);
    setNurseName(nurseData.name);
    // Derive initials from name
    const initials = nurseData.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    setNurseInitials(initials);
    setIsAuthenticated(true);
    localStorage.setItem('auth_nurse', JSON.stringify(nurseData));
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setNurse(null);
    setNurseName('');
    setNurseInitials('');
    localStorage.removeItem('auth_nurse');
  }, []);

  return (
    <AuthContext.Provider value={{ nurse, nurseName, nurseInitials, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

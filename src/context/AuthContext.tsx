'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { Nurse } from '@/types/database'

const STORAGE_KEY = 'attenda_nurse_id'

interface AuthContextValue {
  nurse: Nurse | null
  loading: boolean
  login: (employeeId: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [nurse, setNurse] = useState<Nurse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY)
    if (!storedId) {
      setLoading(false)
      return
    }

    supabase
      .from('nurses')
      .select('*')
      .eq('id', storedId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setNurse(data as Nurse)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
        setLoading(false)
      })
  }, [])

  async function login(employeeId: string, password: string) {
    const { data, error } = await supabase
      .from('nurses')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('password_hash', password)
      .single()

    if (error || !data) {
      throw new Error('Invalid credentials')
    }

    const nurseData = data as Nurse
    localStorage.setItem(STORAGE_KEY, nurseData.id)
    setNurse(nurseData)
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setNurse(null)
  }

  return (
    <AuthContext.Provider value={{ nurse, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

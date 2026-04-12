'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getSupabase } from '@/lib/supabase'

const supabase = getSupabase()

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading } = useAuth()
  const [mode, setMode] = useState<'nurse' | 'patient'>('nurse')
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [patientName, setPatientName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, router])

  async function handleNurseSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(employeeId, password)
      router.push('/dashboard')
    } catch {
      setError('Authentication failed. Verify your credentials and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePatientSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { data, error: dbError } = await supabase
        .from('patients')
        .select('*, bed:beds(*, room:rooms(*))')
        .ilike('name', `%${patientName}%`)

      if (dbError || !data?.length) {
        setError('Patient not found. Check your name and try again.')
        setSubmitting(false)
        return
      }

      const patient = data[0]
      localStorage.setItem('patient_session', JSON.stringify(patient))
      router.push('/patient')
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-main px-4">
      <div className="fixed top-4 left-4 text-[10px] font-semibold tracking-widest text-text-muted uppercase">
        Secure Mode
      </div>
      <div className="fixed top-4 right-4 text-[10px] font-semibold tracking-widest text-text-muted uppercase">
        V5 A.I Clinical
      </div>

      <div className="w-full max-w-[390px] space-y-8">
        {/* Logo + Title */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <span className="text-3xl font-bold text-primary">+</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Attenda</h1>
          <p className="text-sm text-text-muted">
            {mode === 'nurse' ? 'Staff Portal · Authentication required' : 'Patient Portal · Record your request'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-xl bg-[#E7EEFF] p-1">
          <button
            onClick={() => { setMode('nurse'); setError('') }}
            className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all ${
              mode === 'nurse'
                ? 'bg-white text-[#532AA8] shadow-sm'
                : 'text-[#7A7484]'
            }`}
          >
            Nurse Login
          </button>
          <button
            onClick={() => { setMode('patient'); setError('') }}
            className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all ${
              mode === 'patient'
                ? 'bg-white text-[#532AA8] shadow-sm'
                : 'text-[#7A7484]'
            }`}
          >
            Patient Login
          </button>
        </div>

        {/* Nurse form */}
        {mode === 'nurse' && (
          <form onSubmit={handleNurseSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="employee-id" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Employee ID
              </label>
              <input
                id="employee-id"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="NRS-001"
                required
                className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="access-key" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Access Key
              </label>
              <input
                id="access-key"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access key"
                required
                className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #532AA8, #6B46C1)' }}
            >
              {submitting ? 'Authenticating...' : 'Authenticate Session'}
            </button>
          </form>
        )}

        {/* Patient form */}
        {mode === 'patient' && (
          <form onSubmit={handlePatientSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="patient-name" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Patient Name
              </label>
              <input
                id="patient-name"
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Robert Chen"
                required
                className="w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #532AA8, #6B46C1)' }}
            >
              {submitting ? 'Signing in...' : 'Enter Patient Portal'}
            </button>
          </form>
        )}

        {error && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}

        <p className="text-center text-[10px] text-text-muted leading-relaxed">
          Protected by end-to-end encryption. Unauthorized access attempts are logged and reported.
          All sessions are monitored in compliance with hospital security policies.
        </p>
      </div>
    </div>
  )
}

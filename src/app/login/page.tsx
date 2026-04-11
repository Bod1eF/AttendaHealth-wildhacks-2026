'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading } = useAuth()
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, router])

  async function handleSubmit(e: FormEvent) {
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

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-main px-4">
      {/* Top corner labels */}
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
            Staff Portal &middot; Authentication required
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="employee-id" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Employee ID
            </label>
            <input
              id="employee-id"
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="CP-XXXX-XXXX"
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
            {submitting && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {submitting ? 'Authenticating...' : 'Authenticate Session'}
          </button>

          {error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}
        </form>

        {/* Security footer */}
        <p className="text-center text-[10px] text-text-muted leading-relaxed">
          Protected by end-to-end encryption. Unauthorized access attempts are logged and reported.
          All sessions are monitored in compliance with hospital security policies.
        </p>
      </div>
    </div>
  )
}

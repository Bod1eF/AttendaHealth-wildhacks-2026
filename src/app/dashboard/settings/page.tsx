'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { nurse, logout } = useAuth()
  const router = useRouter()

  const [notifications, setNotifications] = useState(true)
  const [sound, setSound] = useState(true)
  const [vibration, setVibration] = useState(false)
  const [criticalAlerts, setCriticalAlerts] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [autoAccept, setAutoAccept] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="flex flex-col px-5 pt-6 h-full overflow-hidden">
      <div className="mb-5">
        <h1 className="text-[28px] font-extrabold tracking-tight text-gray-900">Settings</h1>
        <p className="text-[#7A7484] text-sm font-medium mt-1">Manage your preferences</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-[88px] space-y-4">
        {/* Profile */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[rgba(203,195,213,0.1)]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#532AA8] block mb-3">Profile</span>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#532AA8] flex items-center justify-center text-white font-extrabold text-sm">
              {nurse?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'SJ'}
            </div>
            <div>
              <p className="text-[14px] font-bold text-gray-900">{nurse?.name || 'Nurse'}</p>
              <p className="text-[12px] text-[#7A7484]">ID: {nurse?.employee_id || '—'}</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[rgba(203,195,213,0.1)]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#532AA8] block mb-3">Notifications</span>
          <div className="space-y-3">
            <Toggle label="Push Notifications" value={notifications} onChange={setNotifications} />
            <Toggle label="Sound Alerts" value={sound} onChange={setSound} />
            <Toggle label="Vibration" value={vibration} onChange={setVibration} />
            <Toggle label="Critical Priority Alerts" value={criticalAlerts} onChange={setCriticalAlerts} sublabel="Always notify for critical requests" />
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[rgba(203,195,213,0.1)]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#532AA8] block mb-3">Preferences</span>
          <div className="space-y-3">
            <Toggle label="Dark Mode" value={darkMode} onChange={setDarkMode} />
            <Toggle label="Auto-Accept Requests" value={autoAccept} onChange={setAutoAccept} sublabel="Automatically accept next in queue" />
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[rgba(203,195,213,0.1)]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#532AA8] block mb-3">About</span>
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-[13px] text-[#7A7484]">Version</p>
              <p className="text-[13px] font-medium text-gray-900">1.0.0</p>
            </div>
            <div className="flex justify-between">
              <p className="text-[13px] text-[#7A7484]">Ward</p>
              <p className="text-[13px] font-medium text-gray-900">Unit 4B</p>
            </div>
            <div className="flex justify-between">
              <p className="text-[13px] text-[#7A7484]">Shift</p>
              <p className="text-[13px] font-medium text-gray-900">Day (7am - 7pm)</p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full h-[48px] rounded-full text-[14px] font-bold text-white bg-[#BA1A1A] active:scale-[0.98] transition-transform"
        >
          Log Out
        </button>
      </div>
    </div>
  )
}

function Toggle({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string
  sublabel?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[13px] font-medium text-gray-900">{label}</p>
        {sublabel && <p className="text-[10px] text-[#7A7484] mt-0.5">{sublabel}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full p-0.5 transition-colors ${value ? 'bg-[#532AA8]' : 'bg-[#D1D5DB]'}`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )
}

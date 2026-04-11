'use client';

import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { nurseName, nurseInitials } = useAuth();

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 border-b border-white/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm">
            {nurseInitials}
          </div>
          <div>
            <p className="font-extrabold text-text-primary text-sm leading-tight">
              {nurseName}
            </p>
            <p className="text-[10px] tracking-[1px] font-extrabold text-primary uppercase">
              ATTENDA CARE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] tracking-[1px] font-extrabold uppercase">
            DAY SHIFT
          </span>
          <button className="text-text-muted">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-28">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}

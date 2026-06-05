'use client';

import { useRouter } from 'next/navigation';
import { Bell, Moon, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/auth';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-4 md:px-6">
      <div className="flex items-center gap-4 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F3B7A] text-white">
          <span className="font-bold">A</span>
        </div>
        <span className="font-semibold text-slate-900">KnowYourLeads</span>
      </div>
      
      <div className="hidden lg:flex items-center gap-4 flex-1" />
      
      <div className="flex items-center gap-3 ml-auto">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold">
          <svg className="w-3 h-3 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          248/1500 credits
        </div>
        
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell className="h-5 w-5" />
        </button>

        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
        
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F3B7A] text-white text-xs font-medium ml-1">
          {initials}
        </button>
      </div>
    </header>
  );
}

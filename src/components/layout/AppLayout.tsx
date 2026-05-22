'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden pb-16 lg:pb-0">
        <Header />
        <main className="flex-1 overflow-y-auto bg-transparent">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Library, LayoutTemplate, FileText, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Library', href: '/library', icon: Library },
  { name: 'Templates', href: '/templates', icon: LayoutTemplate },
  { name: 'Reports', href: '/reports', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-[240px] shrink-0 border-r border-slate-200/60 bg-white">
      <div className="flex h-16 items-center px-6 border-b border-slate-200/60">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F3B7A] text-white">
            <span className="font-bold text-lg">A</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 leading-none tracking-tight">KnowYourLeads</span>
            <span className="text-[10px] text-slate-500 leading-none mt-1">AI research agent</span>
             <span className="text-[10px] text-slate-500 leading-none mt-1">powered by Drag-N-Fly</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive 
                  ? 'bg-slate-100/80 text-slate-900' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200/60 mt-auto flex items-center justify-between text-slate-500">
        <button className="p-2 hover:bg-slate-50 hover:text-slate-900 rounded-full transition-colors">
          <Settings className="h-4 w-4" />
        </button>
        <button className="p-2 hover:bg-slate-50 hover:text-slate-900 rounded-full transition-colors">
          <User className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

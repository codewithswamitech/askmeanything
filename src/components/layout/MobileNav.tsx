'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, History, LayoutTemplate, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'New', href: '/', icon: Sparkles },
  { name: 'Recent', href: '/recent', icon: History },
  { name: 'Templates', href: '/templates', icon: LayoutTemplate },
  { name: 'Profile', href: '/profile', icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-background px-4 py-3 pb-safe">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 transition-colors',
              isActive ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

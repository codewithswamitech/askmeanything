'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

const PUBLIC_PATHS = ['/login'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicPath) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, isPublicPath, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#0F3B7A]" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isPublicPath) {
    return null;
  }

  if (isAuthenticated && isPublicPath) {
    router.replace('/');
    return null;
  }

  return <>{children}</>;
}

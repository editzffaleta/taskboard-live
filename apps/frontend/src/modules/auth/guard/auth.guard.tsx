'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/modules/auth/context/auth.context';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/join');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div
        aria-busy="true"
        className="flex h-screen w-full items-center justify-center bg-background"
      />
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return <>{children}</>;
}

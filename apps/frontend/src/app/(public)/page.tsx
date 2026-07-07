'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/modules/auth/context/auth.context';
import { LandingPage } from '@/modules/marketing/components/landing-page.component';

const PRIVATE_HOME_ROUTE = '/boards';

export default function HomePage() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(PRIVATE_HOME_ROUTE);
    }
  }, [status, router]);

  if (status === 'loading' || status === 'authenticated') {
    return <div aria-busy="true" className="min-h-screen bg-background" />;
  }

  return <LandingPage />;
}

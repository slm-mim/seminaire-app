'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-64 pt-14 md:pt-0 p-4 md:p-6">{children}</main>
    </div>
  );
}

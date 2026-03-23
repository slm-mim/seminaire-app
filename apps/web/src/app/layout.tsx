import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { QueryProvider } from '@/lib/query-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Séminaires',
  description: 'Gestion de séminaires',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

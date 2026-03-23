'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

const menuItems = [
  {
    href: '/dashboard',
    label: "Vue d'ensemble",
    roles: ['ADMIN', 'ORGANIZER', 'MODERATOR'],
  },
  { href: '/dashboard/seminaires', label: 'Séminaires', roles: ['ADMIN', 'ORGANIZER'] },
  { href: '/dashboard/contacts', label: 'Contacts', roles: ['ADMIN', 'ORGANIZER'] },
  { href: '/dashboard/templates', label: 'Templates email', roles: ['ADMIN', 'ORGANIZER'] },
  { href: '/dashboard/utilisateurs', label: 'Utilisateurs', roles: ['ADMIN'] },
  { href: '/dashboard/parametres', label: 'Paramètres', roles: ['ADMIN'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const filteredItems = menuItems.filter((item) => user && item.roles.includes(user.role));

  function NavContent() {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4">
          <h2 className="text-lg font-bold">Séminaires</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-1">
          {filteredItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                pathname === item.href ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-2">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            Déconnexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: hamburger menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b p-2 flex items-center">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="sm">
                ☰
              </Button>
            }
          />
          <SheetContent side="left" className="w-64 p-0">
            <NavContent />
          </SheetContent>
        </Sheet>
        <span className="ml-2 font-semibold">Séminaires</span>
      </div>

      {/* Desktop: fixed sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-background">
        <NavContent />
      </aside>
    </>
  );
}

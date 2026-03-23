'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { UserDto, UserRole } from 'shared-types';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  ORGANIZER: 'Organisateur',
  MODERATOR: 'Modérateur',
};

const ROLE_VARIANTS: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  ADMIN: 'default',
  ORGANIZER: 'secondary',
  MODERATOR: 'outline',
};

export default function UtilisateursPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<UserDto | null>(null);
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: UserRole.ORGANIZER as UserRole,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<UserDto[]>('/users'),
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => api.post<UserDto>('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur créé');
      setAddOpen(false);
      setForm({ email: '', firstName: '', lastName: '', password: '', role: UserRole.ORGANIZER });
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || 'Erreur');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      api.patch<UserDto>(`/users/${userId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Rôle mis à jour');
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || 'Erreur');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.del(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur supprimé');
      setDeleteConfirm(null);
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || 'Erreur');
    },
  });

  if (currentUser?.role !== UserRole.ADMIN) {
    return (
      <div className="p-4 text-center text-muted-foreground">Accès réservé aux administrateurs</div>
    );
  }

  if (isLoading) return <div className="p-4">Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button>+ Ajouter</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel utilisateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="user-firstname">Prénom *</Label>
                  <Input
                    id="user-firstname"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="Prénom"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="user-lastname">Nom *</Label>
                  <Input
                    id="user-lastname"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Nom"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="user-email">Email *</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemple.fr"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="user-password">Mot de passe *</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="user-role">Rôle *</Label>
                <select
                  id="user-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => addMutation.mutate(form)}
                disabled={
                  !form.email ||
                  !form.firstName ||
                  !form.lastName ||
                  !form.password ||
                  addMutation.isPending
                }
                className="w-full"
              >
                {addMutation.isPending ? 'Création...' : "Créer l'utilisateur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {users.map((user) => (
          <div key={user.id} className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-2 bg-card">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Badge variant={ROLE_VARIANTS[user.role]}>{ROLE_LABELS[user.role]}</Badge>
            </div>
            {user.id !== currentUser?.id && (
              <div className="flex gap-2">
                <select
                  value={user.role}
                  onChange={(e) =>
                    updateRoleMutation.mutate({ userId: user.id, role: e.target.value as UserRole })
                  }
                  disabled={updateRoleMutation.isPending}
                  className="flex h-7 rounded-lg border border-input bg-transparent px-2 py-0.5 text-xs outline-none focus-visible:border-ring"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(user)}>
                  Supprimer
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-xl ring-1 ring-foreground/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Nom</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Rôle</th>
              <th className="px-4 py-3 text-left font-medium">Créé le</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">
                  {user.firstName} {user.lastName}
                  {user.id === currentUser?.id && (
                    <span className="ml-2 text-xs text-muted-foreground">(vous)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  {user.id !== currentUser?.id ? (
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateRoleMutation.mutate({
                          userId: user.id,
                          role: e.target.value as UserRole,
                        })
                      }
                      disabled={updateRoleMutation.isPending}
                      className="h-7 rounded-lg border border-input bg-transparent px-2 py-0.5 text-xs outline-none focus-visible:border-ring"
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant={ROLE_VARIANTS[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3">
                  {user.id !== currentUser?.id && (
                    <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(user)}>
                      Supprimer
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer l&apos;utilisateur{' '}
              <span className="font-medium text-foreground">
                {deleteConfirm?.firstName} {deleteConfirm?.lastName}
              </span>{' '}
              ? Cette action est irréversible.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { RegistrationDto, RegistrationStatus } from 'shared-types';
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
import Link from 'next/link';

export default function AccueilPage() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInEmail, setWalkInEmail] = useState('');

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['checkin', id],
    queryFn: () => api.get<RegistrationDto[]>(`/checkin/seminars/${id}`),
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      registrationId,
      status,
    }: {
      registrationId: string;
      status: RegistrationStatus;
    }) => api.patch(`/checkin/registrations/${registrationId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin', id] });
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || 'Erreur');
    },
  });

  const walkInMutation = useMutation({
    mutationFn: (data: { name: string; email: string }) =>
      api.post(`/checkin/seminars/${id}/walkin`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin', id] });
      toast.success('Participant ajouté');
      setWalkInOpen(false);
      setWalkInName('');
      setWalkInEmail('');
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || 'Erreur');
    },
  });

  const handleToggle = (reg: RegistrationDto) => {
    const newStatus =
      reg.status === RegistrationStatus.PRESENT
        ? RegistrationStatus.ABSENT
        : RegistrationStatus.PRESENT;
    toggleMutation.mutate({ registrationId: reg.id, status: newStatus });
  };

  const filtered = registrations.filter((r) => {
    const fullName = `${r.contact.firstName} ${r.contact.lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  const total = registrations.length;
  const present = registrations.filter((r) => r.status === RegistrationStatus.PRESENT).length;
  const absent = registrations.filter((r) => r.status === RegistrationStatus.ABSENT).length;

  if (isLoading) return <div className="p-4">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/seminaires/${id}`}
          className="text-muted-foreground hover:text-foreground"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold">Accueil</h1>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3">
        <div className="text-center">
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{present}</p>
          <p className="text-xs text-muted-foreground">Présents</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-500">{absent}</p>
          <p className="text-xs text-muted-foreground">Absents</p>
        </div>
      </div>

      {/* Search + Walk-in */}
      <div className="flex gap-2">
        <Input
          placeholder="Rechercher un participant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" className="shrink-0">
                + Walk-in
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un participant</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="walkin-name">Nom complet *</Label>
                <Input
                  id="walkin-name"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="Prénom Nom"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="walkin-email">Email *</Label>
                <Input
                  id="walkin-email"
                  type="email"
                  value={walkInEmail}
                  onChange={(e) => setWalkInEmail(e.target.value)}
                  placeholder="email@exemple.fr"
                />
              </div>
              <Button
                onClick={() => walkInMutation.mutate({ name: walkInName, email: walkInEmail })}
                disabled={!walkInName || !walkInEmail || walkInMutation.isPending}
                className="w-full"
              >
                {walkInMutation.isPending ? 'Ajout...' : 'Ajouter et marquer présent'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Attendance list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">Aucun participant trouvé</div>
        )}
        {filtered.map((reg) => {
          const isPresent = reg.status === RegistrationStatus.PRESENT;
          return (
            <button
              key={reg.id}
              onClick={() => handleToggle(reg)}
              disabled={toggleMutation.isPending}
              className={`w-full flex items-center justify-between rounded-xl p-4 text-left transition-colors active:scale-[0.99] ${
                isPresent
                  ? 'bg-green-50 ring-1 ring-green-200 dark:bg-green-950/30 dark:ring-green-800'
                  : 'bg-card ring-1 ring-foreground/10 hover:bg-muted/50'
              }`}
            >
              <div>
                <p className="font-medium">
                  {reg.contact.firstName} {reg.contact.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{reg.contact.email}</p>
                {reg.isWalkIn && (
                  <span className="text-xs text-muted-foreground italic">Walk-in</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={isPresent ? 'default' : 'outline'}
                  className={isPresent ? 'bg-green-600 text-white' : 'text-muted-foreground'}
                >
                  {isPresent ? 'Présent' : 'Absent'}
                </Badge>
                <span className="text-xl">{isPresent ? '✓' : '○'}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

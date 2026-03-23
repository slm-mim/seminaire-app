'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { SeminarDto, SeminarStatus, RegistrationDto, RegistrationStatus } from 'shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

const STATUS_LABELS: Record<SeminarStatus, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  CLOSED: 'Inscriptions fermées',
  COMPLETED: 'Terminé',
};

const STATUS_VARIANTS: Record<SeminarStatus, 'default' | 'secondary' | 'outline' | 'destructive'> =
  {
    DRAFT: 'outline',
    PUBLISHED: 'default',
    CLOSED: 'secondary',
    COMPLETED: 'secondary',
  };

interface SeminarStats {
  total: number;
  present: number;
  absent: number;
}

const TABS = [
  { id: 'details', label: 'Détails', href: '' },
  { id: 'inscriptions', label: 'Inscriptions', href: '/inscriptions' },
  { id: 'accueil', label: 'Accueil', href: '/accueil' },
  { id: 'qa', label: 'Q&A', href: '/qa' },
  { id: 'emails', label: 'Emails', href: '/emails' },
];

export default function SeminaireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const queryClient = useQueryClient();

  const { data: seminar, isLoading } = useQuery({
    queryKey: ['seminar', id],
    queryFn: () => api.get<SeminarDto>(`/seminars/${id}`),
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['seminar-registrations', id],
    queryFn: () => api.get<RegistrationDto[]>(`/seminars/${id}/registrations`),
    enabled: !!id,
  });

  const stats: SeminarStats = {
    total: registrations.length,
    present: registrations.filter((r) => r.status === RegistrationStatus.PRESENT).length,
    absent: registrations.filter((r) => r.status === RegistrationStatus.ABSENT).length,
  };

  const statusMutation = useMutation({
    mutationFn: (newStatus: SeminarStatus) =>
      api.patch<SeminarDto>(`/seminars/${id}/status`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seminar', id] });
      queryClient.invalidateQueries({ queryKey: ['seminars'] });
      toast.success('Statut mis à jour');
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || 'Erreur lors de la mise à jour');
    },
  });

  if (isLoading) return <div className="p-4">Chargement...</div>;
  if (!seminar) return <div className="p-4">Séminaire introuvable</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/dashboard/seminaires"
          className="mt-1 text-muted-foreground hover:text-foreground shrink-0"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold truncate">{seminar.title}</h1>
            <Badge variant={STATUS_VARIANTS[seminar.status]}>{STATUS_LABELS[seminar.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{seminar.speaker}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {seminar.status === SeminarStatus.DRAFT && (
          <Button
            onClick={() => statusMutation.mutate(SeminarStatus.PUBLISHED)}
            disabled={statusMutation.isPending}
          >
            Publier
          </Button>
        )}
        {seminar.status === SeminarStatus.PUBLISHED && (
          <Button
            variant="outline"
            onClick={() => statusMutation.mutate(SeminarStatus.CLOSED)}
            disabled={statusMutation.isPending}
          >
            Fermer les inscriptions
          </Button>
        )}
        {(seminar.status === SeminarStatus.CLOSED ||
          seminar.status === SeminarStatus.PUBLISHED) && (
          <Button
            variant="secondary"
            onClick={() => statusMutation.mutate(SeminarStatus.COMPLETED)}
            disabled={statusMutation.isPending}
          >
            Terminer
          </Button>
        )}
        <Link
          href={`/dashboard/seminaires/${id}/edit`}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          Modifier
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card size="sm">
          <CardContent className="text-center py-2">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Inscrits</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="text-center py-2">
            <p className="text-2xl font-bold text-green-600">{stats.present}</p>
            <p className="text-xs text-muted-foreground">Présents</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="text-center py-2">
            <p className="text-2xl font-bold text-red-500">{stats.absent}</p>
            <p className="text-xs text-muted-foreground">Absents</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-1 overflow-x-auto border-b pb-0">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/seminaires/${id}${tab.href}`}
            className={`shrink-0 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab.href === ''
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Details content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Date</p>
              <p className="font-medium">
                {new Date(seminar.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Lieu</p>
              <p className="font-medium">{seminar.location}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Prix</p>
              <p className="font-medium">
                {seminar.price === 0 ? 'Gratuit' : `${seminar.price} €`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Clôture inscriptions</p>
              <p className="font-medium">{seminar.registrationDeadline}h avant</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Rappel</p>
              <p className="font-medium">{seminar.reminderDays} jour(s) avant</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {seminar.description}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/dashboard/seminaires/${id}/accueil`}
          className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background py-3 text-center transition-colors hover:bg-muted"
        >
          <span className="font-medium text-sm">Accueil</span>
          <span className="text-xs text-muted-foreground">Gérer les présences</span>
        </Link>
        <Link
          href={`/dashboard/seminaires/${id}/qa`}
          className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background py-3 text-center transition-colors hover:bg-muted"
        >
          <span className="font-medium text-sm">Q&A</span>
          <span className="text-xs text-muted-foreground">Modérer les questions</span>
        </Link>
      </div>
    </div>
  );
}

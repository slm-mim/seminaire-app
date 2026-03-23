'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SeminarDto, SeminarStatus } from 'shared-types';
import Link from 'next/link';
import { useState } from 'react';

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

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tous' },
  { value: 'DRAFT', label: 'Brouillons' },
  { value: 'PUBLISHED', label: 'Publiés' },
  { value: 'CLOSED', label: 'Fermés' },
  { value: 'COMPLETED', label: 'Terminés' },
];

interface SeminarWithStats extends SeminarDto {
  registrationsCount?: number;
}

export default function SeminairesPage() {
  const api = useApi();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: seminars = [], isLoading } = useQuery({
    queryKey: ['seminars'],
    queryFn: () => api.get<SeminarWithStats[]>('/seminars'),
  });

  const filtered =
    statusFilter === 'ALL' ? seminars : seminars.filter((s) => s.status === statusFilter);

  if (isLoading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Séminaires</h1>
        <Link
          href="/dashboard/seminaires/nouveau"
          className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          + Nouveau séminaire
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">Aucun séminaire trouvé</div>
      )}

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.map((seminar) => (
          <Link key={seminar.id} href={`/dashboard/seminaires/${seminar.id}`}>
            <Card className="cursor-pointer hover:ring-primary/30 transition-shadow">
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-tight">{seminar.title}</p>
                  <Badge variant={STATUS_VARIANTS[seminar.status]}>
                    {STATUS_LABELS[seminar.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{seminar.speaker}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {new Date(seminar.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  {seminar.registrationsCount !== undefined && (
                    <span>{seminar.registrationsCount} inscrit(s)</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-xl ring-1 ring-foreground/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Titre</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
              <th className="px-4 py-3 text-left font-medium">Intervenant</th>
              <th className="px-4 py-3 text-left font-medium">Inscriptions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((seminar) => (
              <tr
                key={seminar.id}
                className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                onClick={() => (window.location.href = `/dashboard/seminaires/${seminar.id}`)}
              >
                <td className="px-4 py-3 font-medium">{seminar.title}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(seminar.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANTS[seminar.status]}>
                    {STATUS_LABELS[seminar.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{seminar.speaker}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {seminar.registrationsCount ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">Aucun séminaire trouvé</div>
        )}
      </div>
    </div>
  );
}

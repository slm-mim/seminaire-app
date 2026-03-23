'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardOverview {
  totalSeminars?: number;
  upcomingSeminars?: number;
  totalContacts?: number;
  totalRegistrations?: number;
}

export default function DashboardPage() {
  const api = useApi();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.get<DashboardOverview>('/dashboard/overview'),
  });

  if (isLoading) return <div className="p-4">Chargement...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vue d&apos;ensemble</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Séminaires</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data?.totalSeminars || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">À venir</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data?.upcomingSeminars || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data?.totalContacts || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Inscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data?.totalRegistrations || 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

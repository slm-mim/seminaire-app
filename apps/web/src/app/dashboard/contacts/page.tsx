'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { ContactDto, ContactSource } from 'shared-types';
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

const SOURCE_LABELS: Record<ContactSource, string> = {
  BREVO_SYNC: 'Brevo',
  MANUAL: 'Manuel',
  REGISTRATION: 'Inscription',
};

const SOURCE_VARIANTS: Record<ContactSource, 'default' | 'secondary' | 'outline'> = {
  BREVO_SYNC: 'secondary',
  MANUAL: 'outline',
  REGISTRATION: 'default',
};

export default function ContactsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    city: '',
    phone: '',
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.get<ContactDto[]>('/contacts'),
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => api.post<ContactDto>('/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact ajouté');
      setAddOpen(false);
      setForm({ firstName: '', lastName: '', email: '', city: '', phone: '' });
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || 'Erreur');
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/contacts/import', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Import réussi');
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || "Erreur lors de l'import");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
  };

  const handleExport = () => {
    window.open('/api/contacts/export', '_blank');
  };

  const filtered = contacts.filter((c) => {
    const fullName = `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  if (isLoading) return <div className="p-4">Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <span className="text-sm text-muted-foreground">{contacts.length} contact(s)</span>
      </div>

      {/* Search + actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Rechercher un contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? 'Import...' : 'Importer CSV'}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            Exporter CSV
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button>+ Ajouter</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="contact-firstname">Prénom *</Label>
                    <Input
                      id="contact-firstname"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      placeholder="Prénom"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="contact-lastname">Nom *</Label>
                    <Input
                      id="contact-lastname"
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                      placeholder="Nom"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contact-email">Email *</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@exemple.fr"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contact-city">Ville *</Label>
                  <Input
                    id="contact-city"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Paris"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contact-phone">
                    Téléphone <span className="text-muted-foreground">(optionnel)</span>
                  </Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+33 6 00 00 00 00"
                  />
                </div>
                <Button
                  onClick={() => addMutation.mutate(form)}
                  disabled={
                    !form.firstName ||
                    !form.lastName ||
                    !form.email ||
                    !form.city ||
                    addMutation.isPending
                  }
                  className="w-full"
                >
                  {addMutation.isPending ? 'Ajout...' : 'Ajouter le contact'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mobile: list */}
      <div className="flex flex-col gap-2 md:hidden">
        {filtered.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">Aucun contact trouvé</div>
        )}
        {filtered.map((contact) => (
          <div
            key={contact.id}
            className="rounded-xl ring-1 ring-foreground/10 p-4 space-y-1 bg-card"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">
                {contact.firstName} {contact.lastName}
              </p>
              <Badge variant={SOURCE_VARIANTS[contact.source]}>
                {SOURCE_LABELS[contact.source]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{contact.email}</p>
            <div className="flex gap-3 text-xs text-muted-foreground">
              {contact.city && <span>{contact.city}</span>}
              {contact.phone && <span>{contact.phone}</span>}
            </div>
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
              <th className="px-4 py-3 text-left font-medium">Ville</th>
              <th className="px-4 py-3 text-left font-medium">Téléphone</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((contact) => (
              <tr key={contact.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">
                  {contact.firstName} {contact.lastName}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{contact.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{contact.city || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{contact.phone || '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={SOURCE_VARIANTS[contact.source]}>
                    {SOURCE_LABELS[contact.source]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">Aucun contact trouvé</div>
        )}
      </div>
    </div>
  );
}

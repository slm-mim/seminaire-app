'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { EmailTemplateType } from 'shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface EmailTemplate {
  id: string;
  name: string;
  type: EmailTemplateType;
  subject: string;
  htmlContent: string;
  createdAt: string;
}

const TYPE_LABELS: Record<EmailTemplateType, string> = {
  INVITATION: 'Invitation',
  REMINDER: 'Rappel',
  POST_EVENT: 'Post-événement',
};

const VARIABLES = [
  { key: '{titre}', desc: 'Titre du séminaire' },
  { key: '{date}', desc: 'Date du séminaire' },
  { key: '{lieu}', desc: 'Lieu du séminaire' },
  { key: '{intervenant}', desc: "Nom de l'intervenant" },
  { key: '{prix}', desc: 'Prix du séminaire' },
  { key: '{nomParticipant}', desc: 'Nom du participant' },
];

export default function TemplatesPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: EmailTemplateType.INVITATION as EmailTemplateType,
    subject: '',
    htmlContent: '',
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => api.get<EmailTemplate[]>('/email-templates'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post<EmailTemplate>('/email-templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template créé');
      setCreateOpen(false);
      setForm({ name: '', type: EmailTemplateType.INVITATION, subject: '', htmlContent: '' });
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || 'Erreur');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) =>
      api.patch<EmailTemplate>(`/email-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template mis à jour');
      setEditTemplate(null);
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || 'Erreur');
    },
  });

  const startEdit = (template: EmailTemplate) => {
    setEditTemplate(template);
    setForm({
      name: template.name,
      type: template.type,
      subject: template.subject,
      htmlContent: template.htmlContent,
    });
  };

  if (isLoading) return <div className="p-4">Chargement...</div>;

  function TemplateForm({ isEdit }: { isEdit?: boolean }) {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="tpl-name">Nom du template *</Label>
          <Input
            id="tpl-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Invitation séminaire mensuel"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tpl-type">Type *</Label>
          <select
            id="tpl-type"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EmailTemplateType }))}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="tpl-subject">Sujet de l&apos;email *</Label>
          <Input
            id="tpl-subject"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="Ex: Invitation au séminaire {titre}"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tpl-content">Contenu HTML *</Label>
          <Textarea
            id="tpl-content"
            value={form.htmlContent}
            onChange={(e) => setForm((f) => ({ ...f, htmlContent: e.target.value }))}
            placeholder="<p>Bonjour {nomParticipant},</p>..."
            rows={8}
            className="font-mono text-xs"
          />
        </div>

        {/* Variables reference */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Variables disponibles :</p>
          <div className="grid grid-cols-1 gap-1">
            {VARIABLES.map((v) => (
              <div key={v.key} className="flex items-center gap-2 text-xs">
                <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs ring-1 ring-foreground/10">
                  {v.key}
                </code>
                <span className="text-muted-foreground">{v.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={() => {
            if (isEdit && editTemplate) {
              updateMutation.mutate({ id: editTemplate.id, data: form });
            } else {
              createMutation.mutate(form);
            }
          }}
          disabled={
            !form.name ||
            !form.subject ||
            !form.htmlContent ||
            createMutation.isPending ||
            updateMutation.isPending
          }
          className="w-full"
        >
          {createMutation.isPending || updateMutation.isPending
            ? 'Enregistrement...'
            : isEdit
              ? 'Mettre à jour'
              : 'Créer le template'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Templates email</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button>+ Nouveau template</Button>} />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouveau template</DialogTitle>
            </DialogHeader>
            <TemplateForm />
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p>Aucun template email</p>
          <p className="text-xs mt-1">Créez votre premier template pour envoyer des emails</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <Badge variant="outline">{TYPE_LABELS[template.type]}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Sujet :</span> {template.subject}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(template)}>
                  Modifier
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPreviewTemplate(template)}>
                  Aperçu
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => !open && setEditTemplate(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le template</DialogTitle>
          </DialogHeader>
          <TemplateForm isEdit />
        </DialogContent>
      </Dialog>

      {/* Preview dialog — shows raw HTML source, no XSS risk */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aperçu : {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Sujet :</span> {previewTemplate.subject}
              </p>
              <pre className="rounded-lg border bg-muted/50 p-4 text-xs max-h-96 overflow-auto whitespace-pre-wrap font-mono">
                {previewTemplate.htmlContent}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

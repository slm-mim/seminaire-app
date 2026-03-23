'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createSeminarSchema, CreateSeminarInput } from 'validation';
import { SeminarDto } from 'shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface FormData {
  title: string;
  description: string;
  speaker: string;
  price: string;
  date: string;
  location: string;
  image: string;
  registrationDeadline: string;
  reminderDays: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  speaker?: string;
  price?: string;
  date?: string;
  location?: string;
  image?: string;
  registrationDeadline?: string;
  reminderDays?: string;
}

export default function NouveauSeminairePage() {
  const api = useApi();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    speaker: '',
    price: '0',
    date: '',
    location: '',
    image: '',
    registrationDeadline: '48',
    reminderDays: '3',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const mutation = useMutation({
    mutationFn: (data: CreateSeminarInput) => api.post<SeminarDto>('/seminars', data),
    onSuccess: (seminar) => {
      toast.success('Séminaire créé avec succès');
      router.push(`/dashboard/seminaires/${seminar.id}`);
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || 'Erreur lors de la création');
    },
  });

  const handleChange =
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Convert date from datetime-local to ISO string
    let isoDate = '';
    if (formData.date) {
      isoDate = new Date(formData.date).toISOString();
    }

    const result = createSeminarSchema.safeParse({
      title: formData.title,
      description: formData.description,
      speaker: formData.speaker,
      price: parseFloat(formData.price) || 0,
      date: isoDate,
      location: formData.location,
      image: formData.image || undefined,
      registrationDeadline: parseInt(formData.registrationDeadline, 10) || 48,
      reminderDays: parseInt(formData.reminderDays, 10) || 3,
    });

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    mutation.mutate(result.data);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/seminaires" className="text-muted-foreground hover:text-foreground">
          ← Retour
        </Link>
        <h1 className="text-2xl font-bold">Nouveau séminaire</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du séminaire</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={handleChange('title')}
                placeholder="Titre du séminaire"
                aria-invalid={!!errors.title}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={handleChange('description')}
                placeholder="Description du séminaire"
                rows={4}
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="speaker">Intervenant *</Label>
                <Input
                  id="speaker"
                  value={formData.speaker}
                  onChange={handleChange('speaker')}
                  placeholder="Nom de l'intervenant"
                  aria-invalid={!!errors.speaker}
                />
                {errors.speaker && <p className="text-xs text-destructive">{errors.speaker}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="price">Prix (€) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleChange('price')}
                  placeholder="0"
                  aria-invalid={!!errors.price}
                />
                {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="date">Date et heure *</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={handleChange('date')}
                  aria-invalid={!!errors.date}
                />
                {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="location">Lieu *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={handleChange('location')}
                  placeholder="Adresse ou lien"
                  aria-invalid={!!errors.location}
                />
                {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="image">
                URL de l&apos;image <span className="text-muted-foreground">(optionnel)</span>
              </Label>
              <Input
                id="image"
                value={formData.image}
                onChange={handleChange('image')}
                placeholder="https://example.com/image.jpg"
                aria-invalid={!!errors.image}
              />
              {errors.image && <p className="text-xs text-destructive">{errors.image}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="registrationDeadline">
                  Clôture des inscriptions (heures avant)
                </Label>
                <Input
                  id="registrationDeadline"
                  type="number"
                  min="1"
                  value={formData.registrationDeadline}
                  onChange={handleChange('registrationDeadline')}
                  placeholder="48"
                  aria-invalid={!!errors.registrationDeadline}
                />
                {errors.registrationDeadline && (
                  <p className="text-xs text-destructive">{errors.registrationDeadline}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="reminderDays">Rappel (jours avant)</Label>
                <Input
                  id="reminderDays"
                  type="number"
                  min="1"
                  value={formData.reminderDays}
                  onChange={handleChange('reminderDays')}
                  placeholder="3"
                  aria-invalid={!!errors.reminderDays}
                />
                {errors.reminderDays && (
                  <p className="text-xs text-destructive">{errors.reminderDays}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Création...' : 'Créer le séminaire'}
              </Button>
              <Link
                href="/dashboard/seminaires"
                className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Annuler
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { registrationSchema, type RegistrationInput } from 'validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Seminar {
  id: string;
  title: string;
  description: string;
  speaker: string;
  date: string;
  location: string;
  price: number;
  status: string;
  registrationsOpen: boolean;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  phone: string;
  consent: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  city?: string;
  phone?: string;
  consent?: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(price: number): string {
  if (price === 0) return 'Gratuit';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
}

export default function SeminairePage() {
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    city: '',
    phone: '',
    consent: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const {
    data: seminar,
    isLoading,
    isError,
  } = useQuery<Seminar>({
    queryKey: ['seminar-public', id],
    queryFn: () => api.get<Seminar>(`/seminars/${id}/public`),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (data: RegistrationInput) => api.post(`/seminars/${id}/register`, data),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: unknown) => {
      const apiErr = error as ApiError;
      if (apiErr.status === 409) {
        toast.error('Vous êtes déjà inscrit à ce séminaire.');
      } else if (apiErr.status === 403) {
        toast.error('Les inscriptions sont closes pour ce séminaire.');
      } else {
        toast.error('Une erreur est survenue. Veuillez réessayer.');
      }
    },
  });

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'consent' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = registrationSchema.safeParse({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      city: formData.city,
      phone: formData.phone || undefined,
      consent: formData.consent,
    });

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormErrors;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    mutation.mutate(result.data);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (isError || !seminar || seminar.status !== 'PUBLISHED') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Séminaire non disponible</h1>
          <p className="mt-2 text-muted-foreground">
            Ce séminaire n&apos;existe pas ou n&apos;est plus accessible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Seminar info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl leading-snug">{seminar.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {seminar.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{seminar.description}</p>
            )}
            <div className="flex flex-col gap-2 text-sm">
              {seminar.speaker && (
                <div className="flex items-start gap-2">
                  <span className="font-medium text-foreground min-w-[5rem]">Intervenant</span>
                  <span className="text-muted-foreground">{seminar.speaker}</span>
                </div>
              )}
              {seminar.date && (
                <div className="flex items-start gap-2">
                  <span className="font-medium text-foreground min-w-[5rem]">Date</span>
                  <span className="text-muted-foreground">{formatDate(seminar.date)}</span>
                </div>
              )}
              {seminar.location && (
                <div className="flex items-start gap-2">
                  <span className="font-medium text-foreground min-w-[5rem]">Lieu</span>
                  <span className="text-muted-foreground">{seminar.location}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[5rem]">Tarif</span>
                <span className="text-muted-foreground">{formatPrice(seminar.price)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration form or messages */}
        {submitted ? (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl">
                ✓
              </div>
              <h2 className="text-lg font-semibold text-foreground">Inscription confirmée !</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Vous êtes bien inscrit à ce séminaire. Un email de confirmation vous a été envoyé.
              </p>
            </CardContent>
          </Card>
        ) : !seminar.registrationsOpen ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="font-medium text-foreground">Les inscriptions sont closes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Il n&apos;est plus possible de s&apos;inscrire à ce séminaire.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formulaire d&apos;inscription</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">Prénom *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange('firstName')}
                      placeholder="Marie"
                      autoComplete="given-name"
                      aria-invalid={!!errors.firstName}
                    />
                    {errors.firstName && (
                      <p className="text-xs text-destructive">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange('lastName')}
                      placeholder="Dupont"
                      autoComplete="family-name"
                      aria-invalid={!!errors.lastName}
                    />
                    {errors.lastName && (
                      <p className="text-xs text-destructive">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange('email')}
                    placeholder="marie.dupont@email.com"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city">Ville *</Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange('city')}
                    placeholder="Paris"
                    autoComplete="address-level2"
                    aria-invalid={!!errors.city}
                  />
                  {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Téléphone (optionnel)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange('phone')}
                    placeholder="06 12 34 56 78"
                    autoComplete="tel"
                  />
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <input
                    id="consent"
                    type="checkbox"
                    checked={formData.consent}
                    onChange={handleChange('consent')}
                    className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-input accent-primary"
                    aria-invalid={!!errors.consent}
                  />
                  <label
                    htmlFor="consent"
                    className="cursor-pointer text-sm leading-relaxed text-muted-foreground"
                  >
                    J&apos;accepte que mes données soient utilisées dans le cadre de ce séminaire
                  </label>
                </div>
                {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}

                <Button
                  type="submit"
                  className="mt-2 h-12 w-full text-base"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Envoi en cours...' : "S'inscrire"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

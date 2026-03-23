'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { submitQuestionSchema, type SubmitQuestionInput } from 'validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface QaSession {
  id: string;
  title: string;
  status: 'OPEN' | 'CLOSED';
}

interface FormData {
  gender: 'MALE' | 'FEMALE' | '';
  authorName: string;
  content: string;
}

interface FormErrors {
  gender?: string;
  authorName?: string;
  content?: string;
}

const MAX_CHARS = 500;

export default function QaPage() {
  const { code } = useParams<{ code: string }>();
  const [formData, setFormData] = useState<FormData>({
    gender: '',
    authorName: '',
    content: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const {
    data: session,
    isLoading,
    isError,
  } = useQuery<QaSession>({
    queryKey: ['qa-session-public', code],
    queryFn: () => api.get<QaSession>(`/qa/sessions/${code}/public`),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (data: SubmitQuestionInput) =>
      api.post(`/qa/sessions/${session!.id}/questions`, data),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: unknown) => {
      const apiErr = error as ApiError;
      if (apiErr.status === 403) {
        toast.error('Les questions sont fermées pour ce séminaire.');
      } else {
        toast.error('Une erreur est survenue. Veuillez réessayer.');
      }
    },
  });

  const handleReset = () => {
    setFormData({ gender: '', authorName: '', content: '' });
    setErrors({});
    setSubmitted(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = submitQuestionSchema.safeParse({
      content: formData.content,
      authorName: formData.authorName || undefined,
      gender: formData.gender || undefined,
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

  if (isError || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Session introuvable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce lien n&apos;est plus valide ou a expiré.
          </p>
        </div>
      </div>
    );
  }

  if (session.status === 'CLOSED') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-2xl">
            🔒
          </div>
          <h1 className="text-xl font-semibold text-foreground">Les questions sont fermées</h1>
          {session.title && <p className="mt-2 text-sm text-muted-foreground">{session.title}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        {session.title && (
          <p className="mb-4 text-center text-sm font-medium text-muted-foreground">
            {session.title}
          </p>
        )}

        {submitted ? (
          <Card>
            <CardContent className="py-10 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl">
                ✓
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Votre question a été envoyée
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Merci ! Votre question a bien été transmise à l&apos;intervenant.
              </p>
              <Button
                onClick={handleReset}
                variant="outline"
                className="mt-6 h-12 w-full text-base"
              >
                Poser une autre question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Poser une question</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Gender selection */}
                <div className="space-y-2">
                  <Label>Civilité *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, gender: 'MALE' }));
                        if (errors.gender) setErrors((prev) => ({ ...prev, gender: undefined }));
                      }}
                      className={[
                        'h-14 rounded-xl border-2 text-base font-medium transition-colors active:scale-95',
                        formData.gender === 'MALE'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:border-primary/50',
                      ].join(' ')}
                    >
                      Homme
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, gender: 'FEMALE' }));
                        if (errors.gender) setErrors((prev) => ({ ...prev, gender: undefined }));
                      }}
                      className={[
                        'h-14 rounded-xl border-2 text-base font-medium transition-colors active:scale-95',
                        formData.gender === 'FEMALE'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:border-primary/50',
                      ].join(' ')}
                    >
                      Femme
                    </button>
                  </div>
                  {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
                </div>

                {/* Name (optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="authorName">Prénom (optionnel)</Label>
                  <Input
                    id="authorName"
                    type="text"
                    value={formData.authorName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, authorName: e.target.value }))
                    }
                    placeholder="Anonyme"
                    autoComplete="given-name"
                    className="h-12 text-base"
                  />
                </div>

                {/* Question textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content">Votre question *</Label>
                    <span
                      className={[
                        'text-xs',
                        formData.content.length >= MAX_CHARS
                          ? 'text-destructive'
                          : 'text-muted-foreground',
                      ].join(' ')}
                    >
                      {formData.content.length}/{MAX_CHARS}
                    </span>
                  </div>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        content: e.target.value.slice(0, MAX_CHARS),
                      }))
                    }
                    placeholder="Posez votre question ici..."
                    rows={4}
                    className="resize-none text-base"
                    aria-invalid={!!errors.content}
                  />
                  {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
                </div>

                <Button
                  type="submit"
                  className="h-14 w-full text-base"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Envoi...' : 'Envoyer ma question'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

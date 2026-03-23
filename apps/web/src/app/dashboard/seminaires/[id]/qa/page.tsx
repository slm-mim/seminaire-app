'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { QASessionDto, QuestionDto, QuestionStatus, QASessionStatus, Gender } from 'shared-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Link from 'next/link';

const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
  ANSWERED: 'Répondue',
};

const QUESTION_STATUS_VARIANTS: Record<
  QuestionStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  PENDING: 'outline',
  APPROVED: 'default',
  REJECTED: 'destructive',
  ANSWERED: 'secondary',
};

const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'M.',
  FEMALE: 'Mme',
};

export default function QAPage() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const queryClient = useQueryClient();
  const [editQuestion, setEditQuestion] = useState<QuestionDto | null>(null);
  const [editContent, setEditContent] = useState('');

  const { data: session, isLoading } = useQuery({
    queryKey: ['qa-session', id],
    queryFn: () => api.get<QASessionDto | null>(`/seminars/${id}/qa-session`),
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['qa-questions', session?.id],
    queryFn: () => api.get<QuestionDto[]>(`/qa-sessions/${session?.id}/questions`),
    enabled: !!session?.id,
    refetchInterval: session?.status === QASessionStatus.OPEN ? 5000 : false,
  });

  const createSessionMutation = useMutation({
    mutationFn: () => api.post<QASessionDto>(`/seminars/${id}/qa-session`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-session', id] });
      toast.success('Session Q&A ouverte');
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || 'Erreur');
    },
  });

  const toggleSessionMutation = useMutation({
    mutationFn: (status: QASessionStatus) =>
      api.patch<QASessionDto>(`/qa-sessions/${session?.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-session', id] });
      toast.success('Statut de la session mis à jour');
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || 'Erreur');
    },
  });

  const questionMutation = useMutation({
    mutationFn: ({
      questionId,
      status,
      content,
    }: {
      questionId: string;
      status?: QuestionStatus;
      content?: string;
    }) => api.patch(`/questions/${questionId}`, { status, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-questions', session?.id] });
      setEditQuestion(null);
      toast.success('Question mise à jour');
    },
    onError: (error: unknown) => {
      const e = error as { message?: string };
      toast.error(e.message || 'Erreur');
    },
  });

  if (isLoading) return <div className="p-4">Chargement...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/seminaires/${id}`}
            className="text-muted-foreground hover:text-foreground"
          >
            ←
          </Link>
          <h1 className="text-xl font-bold">Q&A</h1>
        </div>
        {session && (
          <Badge variant={session.status === QASessionStatus.OPEN ? 'default' : 'secondary'}>
            {session.status === QASessionStatus.OPEN ? 'Ouverte' : 'Fermée'}
          </Badge>
        )}
      </div>

      {/* No session */}
      {!session && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-muted-foreground">Aucune session Q&A pour ce séminaire</p>
          <Button
            onClick={() => createSessionMutation.mutate()}
            disabled={createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? 'Ouverture...' : 'Ouvrir une session Q&A'}
          </Button>
        </div>
      )}

      {/* Session exists */}
      {session && (
        <div className="space-y-4">
          {/* Session controls */}
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              variant={session.status === QASessionStatus.OPEN ? 'destructive' : 'default'}
              onClick={() =>
                toggleSessionMutation.mutate(
                  session.status === QASessionStatus.OPEN
                    ? QASessionStatus.CLOSED
                    : QASessionStatus.OPEN,
                )
              }
              disabled={toggleSessionMutation.isPending}
            >
              {session.status === QASessionStatus.OPEN ? 'Fermer la session' : 'Rouvrir la session'}
            </Button>

            {session.qrCodeUrl && (
              <Dialog>
                <DialogTrigger render={<Button variant="outline">Afficher le QR code</Button>} />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>QR code de la session</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center gap-4">
                    <img src={session.qrCodeUrl} alt="QR code" className="w-48 h-48 rounded-lg" />
                    <p className="text-sm text-muted-foreground text-center">
                      Partagez ce QR code avec les participants pour qu&apos;ils puissent poser des
                      questions
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <span className="text-sm text-muted-foreground">{questions.length} question(s)</span>
          </div>

          {/* Questions */}
          {questions.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              Aucune question pour le moment
              {session.status === QASessionStatus.OPEN && (
                <p className="text-xs mt-1">Actualisation automatique toutes les 5 secondes</p>
              )}
            </div>
          )}

          <div className="space-y-3">
            {questions.map((question) => (
              <Card key={question.id}>
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-snug">{question.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {question.gender ? GENDER_LABELS[question.gender] : ''}{' '}
                        {question.authorName || 'Anonyme'} ·{' '}
                        {new Date(question.submittedAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Badge variant={QUESTION_STATUS_VARIANTS[question.status]}>
                      {QUESTION_STATUS_LABELS[question.status]}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {question.status === QuestionStatus.PENDING && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            questionMutation.mutate({
                              questionId: question.id,
                              status: QuestionStatus.APPROVED,
                            })
                          }
                          disabled={questionMutation.isPending}
                        >
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            questionMutation.mutate({
                              questionId: question.id,
                              status: QuestionStatus.REJECTED,
                            })
                          }
                          disabled={questionMutation.isPending}
                        >
                          Rejeter
                        </Button>
                      </>
                    )}
                    {question.status === QuestionStatus.APPROVED && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          questionMutation.mutate({
                            questionId: question.id,
                            status: QuestionStatus.ANSWERED,
                          })
                        }
                        disabled={questionMutation.isPending}
                      >
                        Marquer répondue
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditQuestion(question);
                        setEditContent(question.content);
                      }}
                    >
                      Modifier
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit question dialog */}
      <Dialog open={!!editQuestion} onOpenChange={(open) => !open && setEditQuestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la question</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="edit-content">Question</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={() =>
                editQuestion &&
                questionMutation.mutate({
                  questionId: editQuestion.id,
                  content: editContent,
                })
              }
              disabled={questionMutation.isPending}
              className="w-full"
            >
              {questionMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

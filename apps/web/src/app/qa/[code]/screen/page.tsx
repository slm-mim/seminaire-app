'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface QaSession {
  id: string;
  title: string;
  status: 'OPEN' | 'CLOSED';
}

interface Question {
  id: string;
  content: string;
  authorName: string | null;
  gender: 'MALE' | 'FEMALE';
  approvedAt: string;
}

function GenderPrefix({ gender }: { gender: 'MALE' | 'FEMALE' }) {
  return <span className="text-yellow-300 font-semibold">{gender === 'MALE' ? 'M.' : 'Mme'}</span>;
}

function QuestionCard({ question, index }: { question: Question; index: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/60">
          {index + 1}
        </span>
        <div className="flex items-center gap-1.5 text-lg">
          <GenderPrefix gender={question.gender} />
          <span className="text-white/80 font-medium">{question.authorName || 'Anonyme'}</span>
        </div>
      </div>
      <p className="text-2xl font-medium leading-snug text-white">{question.content}</p>
    </div>
  );
}

export default function QaScreenPage() {
  const { code } = useParams<{ code: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const { data: session, isLoading: sessionLoading } = useQuery<QaSession>({
    queryKey: ['qa-session-screen', code],
    queryFn: () => api.get<QaSession>(`/qa/sessions/${code}/public`),
    retry: false,
  });

  // Fetch approved questions once session is loaded
  const { data: initialQuestions, refetch } = useQuery<Question[]>({
    queryKey: ['qa-questions-screen', session?.id],
    queryFn: () => api.get<Question[]>(`/qa/sessions/${session!.id}/screen`),
    enabled: !!session?.id,
    refetchInterval: 10_000, // auto-refresh every 10s as fallback
  });

  // Sync initial questions into state
  useEffect(() => {
    if (initialQuestions) {
      setQuestions(initialQuestions);
    }
  }, [initialQuestions]);

  // Auto-scroll to bottom when new questions arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [questions]);

  // Socket.io connection
  useEffect(() => {
    if (!session?.id) return;

    const socket = io(`${API_URL}/qa`, {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinSession', session.id);
    });

    socket.on('questionUpdate', (newQuestion: Question) => {
      setQuestions((prev) => {
        const exists = prev.some((q) => q.id === newQuestion.id);
        if (exists) return prev;
        return [...prev, newQuestion];
      });
    });

    socket.on('disconnect', () => {
      // Will rely on refetchInterval as fallback
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.id]);

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-white/50 text-xl">Chargement...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-white/50 text-xl">Session introuvable</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Questions</h1>
          {session.title && <p className="mt-1 text-lg text-white/50">{session.title}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div
            className={[
              'size-3 rounded-full',
              session.status === 'OPEN' ? 'animate-pulse bg-green-400' : 'bg-white/20',
            ].join(' ')}
          />
          <span className="text-sm text-white/40">
            {session.status === 'OPEN' ? 'En direct' : 'Fermé'}
          </span>
        </div>
      </div>

      {/* Questions list */}
      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-4xl font-light text-white/20">Aucune question pour le moment</p>
          <p className="mt-4 text-xl text-white/10">Les questions approuvées apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionCard key={question.id} question={question} index={index} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-white/20">
          {questions.length} question{questions.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

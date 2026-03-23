import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <main className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">
            S
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Séminaires</h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Plateforme de gestion des séminaires — inscriptions, suivi et questions en direct.
          </p>
        </div>

        <Link
          href="/login"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
        >
          Se connecter
        </Link>

        <p className="text-sm text-muted-foreground">Accès réservé aux organisateurs</p>
      </main>
    </div>
  );
}

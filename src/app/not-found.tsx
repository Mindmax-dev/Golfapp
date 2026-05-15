import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl mb-4">⛳</p>
        <h1 className="text-4xl font-bold text-[var(--color-foreground)] mb-2">404</h1>
        <p className="text-[var(--color-muted-foreground)] mb-6">
          Diese Seite existiert nicht.
        </p>
        <Link
          href="/home"
          className="text-[var(--color-primary)] hover:underline"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}

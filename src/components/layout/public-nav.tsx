import Link from "next/link";

export function PublicNav() {
  return (
    <header className="border-b border-[var(--color-card-border)] bg-[var(--color-card)]">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between h-14">
        <Link
          href="/home"
          className="flex items-center gap-2 font-semibold text-[var(--color-foreground)]"
        >
          <span className="text-[var(--color-primary)]">⛳</span>
          <span>Golf Tracker</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/home"
            className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            Statistiken
          </Link>
          <Link
            href="/bag"
            className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            Bag
          </Link>
          <Link
            href="/login"
            className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
          >
            Admin
          </Link>
        </div>
      </nav>
    </header>
  );
}

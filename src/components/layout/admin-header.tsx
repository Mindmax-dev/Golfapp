import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

interface AdminHeaderProps {
  email?: string;
}

export function AdminHeader({ email }: AdminHeaderProps) {
  return (
    <header className="h-14 border-b border-[var(--color-card-border)] bg-[var(--color-card)] flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        {email && (
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {email}
          </span>
        )}
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Abmelden
          </Button>
        </form>
      </div>
    </header>
  );
}

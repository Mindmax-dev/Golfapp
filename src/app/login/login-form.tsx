"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type AuthState = { error: string } | null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Wird angemeldet..." : "Anmelden"}
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<AuthState, FormData>(signIn, null);

  return (
    <form
      action={action}
      className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 flex flex-col gap-4"
    >
      {state?.error && (
        <div className="rounded-md bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/30 px-4 py-3 text-sm text-[var(--color-destructive)]">
          {state.error}
        </div>
      )}
      <Input
        id="email"
        name="email"
        type="email"
        label="E-Mail"
        placeholder="admin@beispiel.de"
        required
        autoComplete="email"
      />
      <Input
        id="password"
        name="password"
        type="password"
        label="Passwort"
        placeholder="••••••••"
        required
        autoComplete="current-password"
      />
      <SubmitButton />
    </form>
  );
}

import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">⛳</span>
          <h1 className="mt-4 text-2xl font-bold text-[var(--color-foreground)]">
            Golf Tracker
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Admin-Bereich
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

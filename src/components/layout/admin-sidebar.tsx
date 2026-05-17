"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/runden", label: "Runden", icon: "🏌️" },
  { href: "/admin/bag", label: "Bag", icon: "🎒" },
  { href: "/admin/profil", label: "Profil", icon: "👤" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-[var(--color-card-border)] bg-[var(--color-card)] min-h-screen flex flex-col">
      <div className="p-4 border-b border-[var(--color-card-border)]">
        <Link href="/home" className="flex items-center gap-2 font-semibold">
          <span className="text-[var(--color-primary)]">⛳</span>
          <span className="text-sm">Golf Tracker</span>
        </Link>
      </div>
      <nav className="p-3 flex-1 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[var(--color-card-border)]">
        <Link
          href="/home"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <span>🌐</span>
          <span>Öffentliche Ansicht</span>
        </Link>
      </div>
    </aside>
  );
}

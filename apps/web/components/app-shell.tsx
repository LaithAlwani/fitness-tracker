"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@liftify/convex";
import {
  House,
  Barbell,
  Scales,
  ChartLineUp,
  Gear,
  Storefront,
  Heart,
  type Icon,
} from "@phosphor-icons/react";
import { NotificationBell } from "@/components/notification-bell";
import { RestTimerProvider } from "@/components/rest-timer";

const DONATE_URL =
  process.env.NEXT_PUBLIC_DONATE_URL || "https://ko-fi.com/liftify";

const NAV: { href: string; label: string; icon: Icon }[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/workout/new", label: "Log", icon: Barbell },
  { href: "/body", label: "Body", icon: Scales },
  { href: "/progress", label: "Progress", icon: ChartLineUp },
  { href: "/shop", label: "Shop", icon: Storefront },
];

function DonateButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Support Liftify"
      title="Support Liftify"
      className={`flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent-strong ${className}`}
    >
      <Heart weight="fill" className="size-5" />
    </a>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const ensureUser = useMutation(api.users.getOrCreateCurrentUser);
  const ensureWeekly = useMutation(api.notifications.ensureWeekly);

  const initial = (
    user?.firstName?.[0] ??
    user?.primaryEmailAddress?.emailAddress?.[0] ??
    "U"
  ).toUpperCase();

  useEffect(() => {
    if (!isAuthenticated) return;
    ensureUser()
      .then(() => ensureWeekly())
      .catch(() => {});
  }, [isAuthenticated, ensureUser, ensureWeekly]);

  const avatar = user?.imageUrl ? (
    <span className="size-8 overflow-hidden rounded-full border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={user.imageUrl} alt="" className="size-full object-cover" />
    </span>
  ) : (
    <span className="flex size-8 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold">
      {initial}
    </span>
  );

  return (
    <RestTimerProvider>
    <div className="flex min-h-full flex-1 flex-col md:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center justify-between px-5">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Barbell weight="bold" className="size-5" />
            </span>
            Liftify
          </Link>
          <div className="flex items-center gap-1">
            <DonateButton />
            <NotificationBell />
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Ico = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent/15 text-accent-strong"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Ico weight="regular" className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/settings"
          className={`m-3 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted ${
            pathname.startsWith("/settings") ? "bg-muted" : ""
          }`}
        >
          {avatar}
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {user?.firstName ?? "Account"}
            </span>
            <span className="block text-xs text-muted-foreground">Settings</span>
          </span>
        </Link>
      </aside>

      {/* Mobile top header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md md:hidden">
        <div className="container-page flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Barbell weight="bold" className="size-5" />
            </span>
            Liftify
          </Link>
          <div className="flex items-center gap-1">
            <DonateButton />
            <NotificationBell />
            <Link
              href="/settings"
              aria-label="Settings"
              className={`flex size-9 items-center justify-center rounded-full transition-colors hover:bg-muted ${
                pathname.startsWith("/settings")
                  ? "text-accent-strong"
                  : "text-foreground"
              }`}
            >
              <Gear className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-12">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around pb-[max(1rem,env(safe-area-inset-bottom))]">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Ico = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${
                  active ? "text-accent-strong" : "text-muted-foreground"
                }`}
              >
                <Ico weight="regular" className="size-6" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
    </RestTimerProvider>
  );
}

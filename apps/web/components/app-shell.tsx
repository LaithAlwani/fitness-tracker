"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@liftify/convex";
import {
  House,
  Barbell,
  Scales,
  ChartLineUp,
  ClockCounterClockwise,
  type Icon,
} from "@phosphor-icons/react";
import { NotificationBell } from "@/components/notification-bell";

const NAV: { href: string; label: string; icon: Icon }[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/workout/new", label: "Log", icon: Barbell },
  { href: "/history", label: "History", icon: ClockCounterClockwise },
  { href: "/body", label: "Body", icon: Scales },
  { href: "/progress", label: "Progress", icon: ChartLineUp },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const ensureUser = useMutation(api.users.getOrCreateCurrentUser);
  const ensureWeekly = useMutation(api.notifications.ensureWeekly);
  const access = useQuery(api.users.accessState);

  const initial = (
    user?.firstName?.[0] ??
    user?.primaryEmailAddress?.emailAddress?.[0] ??
    "U"
  ).toUpperCase();

  // Create the user row (and start the trial) once Convex has the Clerk token,
  // then make sure this week's reminder exists. Gating on isAuthenticated
  // avoids a "Not authenticated" call during the token handshake.
  useEffect(() => {
    if (!isAuthenticated) return;
    ensureUser()
      .then(() => ensureWeekly())
      .catch(() => {});
  }, [isAuthenticated, ensureUser, ensureWeekly]);

  // Gate: send lapsed users to the paywall.
  useEffect(() => {
    if (
      access?.authenticated &&
      !access.hasAccess &&
      pathname !== "/subscribe"
    ) {
      router.replace("/subscribe");
    }
  }, [access, pathname, router]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
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

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const Ico = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Ico weight="regular" className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              href="/settings"
              aria-label="Account & settings"
              className={`flex size-9 items-center justify-center overflow-hidden rounded-full border bg-muted text-sm font-semibold text-foreground transition-colors ${
                pathname.startsWith("/settings")
                  ? "border-accent-strong"
                  : "border-border hover:border-accent-strong/40"
              }`}
            >
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.imageUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span>{initial}</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 sm:pb-12">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
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
  );
}

"use client";

import Link from "next/link";
import { Flame, ChartLineUp, Lightning } from "@phosphor-icons/react";

const PERKS = [
  { icon: Lightning, text: "Log a full session in under 30 seconds" },
  { icon: ChartLineUp, text: "A performance dashboard for every PR" },
  { icon: Flame, text: "Streaks and weekly goals that keep you honest" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-card lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 size-[32rem] rounded-full bg-violet-600/30 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 bottom-0 size-[30rem] rounded-full bg-fuchsia-600/20 blur-[130px]"
        />

        <Link
          href="/"
          className="relative flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="size-9 rounded-lg" />
          Liftify
        </Link>

        <div className="relative flex flex-col gap-8">
          <h2 className="max-w-md text-4xl font-semibold leading-[1.1] tracking-tighter">
            Lift heavy. Log fast.{" "}
            <span className="bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Watch strength climb.
            </span>
          </h2>
          <ul className="flex flex-col gap-4">
            {PERKS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-muted-foreground">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-strong">
                  <p.icon weight="bold" className="size-5" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-muted-foreground/70">
          © Liftify — built for people who actually lift.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center p-6 py-16">
        {children}
      </main>
    </div>
  );
}

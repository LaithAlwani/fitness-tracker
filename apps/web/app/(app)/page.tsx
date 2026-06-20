import { currentUser } from "@clerk/nextjs/server";

export default async function HomePage() {
  const user = await currentUser();
  const name = user?.firstName ?? "lifter";

  return (
    <div className="container-page flex flex-col gap-6 py-16">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">
          Hey {name}
        </h1>
      </div>

      <div className="rounded-card border border-border bg-card p-6">
        <p className="leading-relaxed text-muted-foreground">
          You&apos;re signed in to Liftify. Your Home, Log Workout, Body Progress
          and Progress screens come online as soon as the Convex backend is
          connected (<code className="font-mono text-sm">npx convex dev</code>).
        </p>
      </div>

      <span className="inline-flex h-12 w-fit cursor-not-allowed items-center justify-center rounded-full bg-muted px-7 font-medium text-muted-foreground">
        Start workout — available once Convex is connected
      </span>
    </div>
  );
}

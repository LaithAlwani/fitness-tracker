// Temporary scaffold page — replaced by the authenticated (app) routes in 2d.
export default function Page() {
  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center gap-6 py-32 text-center">
      <h1 className="text-4xl font-semibold tracking-tighter sm:text-6xl">
        Liftify
      </h1>
      <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
        Track workouts fast and see progress over time.
      </p>
      <span className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-6 font-medium text-accent-foreground">
        Volt token check
      </span>
    </main>
  );
}

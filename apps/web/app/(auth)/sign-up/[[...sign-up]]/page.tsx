import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="container-page flex flex-1 items-center justify-center py-16">
      <SignUp />
    </main>
  );
}

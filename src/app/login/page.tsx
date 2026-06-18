import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { OAuthButtons } from "@/components/ui/OAuthButtons";

async function credentialsAction(formData: FormData) {
  "use server";

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect("/login?error=invalid-credentials");
    }
    throw err;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-bg-card p-8">
        <h1 className="text-2xl font-bold">
          Fit<span className="text-lime">Tribe</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-400">Log in to your member dashboard.</p>

        {error === "invalid-credentials" && (
          <div className="mt-4 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
            Invalid email or password.
          </div>
        )}

        <form action={credentialsAction} className="mt-6 flex flex-col gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-white outline-none focus:border-lime"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-white outline-none focus:border-lime"
          />
          <button
            type="submit"
            className="mt-1 rounded-lg bg-lime py-2.5 text-sm font-bold text-black transition hover:bg-lime-dim"
          >
            Log In
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-neutral-500">
          <div className="h-px flex-1 bg-border" />
          OR
          <div className="h-px flex-1 bg-border" />
        </div>

        <OAuthButtons />
      </div>
    </main>
  );
}

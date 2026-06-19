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
    <main className="flex min-h-screen items-center justify-center bg-sunny px-6">
      <div className="w-full max-w-sm rounded-2xl border-2 border-ink bg-canvas p-8 shadow-[4px_4px_0px_#1A1A2E]">
        <h1 className="text-2xl font-bold text-ink">
          Fit<span className="text-punch">Tribe</span>
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Log in to your member dashboard.</p>

        {error === "invalid-credentials" && (
          <div className="mt-4 rounded-lg border-2 border-punch bg-punch-soft px-3 py-2 text-sm text-punch-dark">
            Invalid email or password.
          </div>
        )}

        <form action={credentialsAction} className="mt-6 flex flex-col gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="rounded-lg border-2 border-ink bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-punch"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="rounded-lg border-2 border-ink bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-punch"
          />
          <button
            type="submit"
            className="mt-1 rounded-lg bg-punch py-2.5 text-sm font-bold text-white transition hover:bg-punch-dark"
          >
            Log In
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-muted">
          <div className="h-px flex-1 bg-ink/20" />
          OR
          <div className="h-px flex-1 bg-ink/20" />
        </div>

        <OAuthButtons />
        <p className="mt-5 text-center text-sm text-ink-muted">
          New here?{" "}
          <a href="/signup" className="text-punch font-semibold hover:underline">
            Create an account
          </a>
        </p>
      </div>
    </main>
  );
}

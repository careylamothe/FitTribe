import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { OAuthButtons } from "@/components/ui/OAuthButtons";

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

async function signupAction(formData: FormData) {
  "use server";

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/signup?error=invalid-input");
  }

  const { name, email, password } = parsed.data;

  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    redirect("/signup?error=email-taken");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { error: insertError } = await supabaseAdmin.from("users").insert({
    name,
    email,
    password_hash: passwordHash,
    role: "member",
  });

  if (insertError) {
    redirect("/signup?error=server-error");
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect("/login");
    }
    throw err;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-input": "Enter a name, a valid email, and a password of at least 8 characters.",
  "email-taken": "An account with that email already exists.",
  "server-error": "Something went wrong creating your account. Please try again.",
};

export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams?.error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-sunny px-6">
      <div className="w-full max-w-sm rounded-2xl border-2 border-ink bg-canvas p-8 shadow-[4px_4px_0px_#1A1A2E]">
        <h1 className="text-2xl font-bold text-ink">
          Join Fit<span className="text-punch">Tribe</span>
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Create your member account.</p>

        {error && ERROR_MESSAGES[error] && (
          <div className="mt-4 rounded-lg border-2 border-punch bg-punch-soft px-3 py-2 text-sm text-punch-dark">
            {ERROR_MESSAGES[error]}
          </div>
        )}

        <form action={signupAction} className="mt-6 flex flex-col gap-3">
          <input
            name="name"
            type="text"
            required
            placeholder="Name"
            className="rounded-lg border-2 border-ink bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-punch"
          />
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
            minLength={8}
            placeholder="Password (8+ characters)"
            className="rounded-lg border-2 border-ink bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-punch"
          />
          <button
            type="submit"
            className="mt-1 rounded-lg bg-punch py-2.5 text-sm font-bold text-white transition hover:bg-punch-dark"
          >
            Create Account
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-muted">
          <div className="h-px flex-1 bg-ink/20" />
          OR
          <div className="h-px flex-1 bg-ink/20" />
        </div>

        <OAuthButtons />

        <p className="mt-5 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-punch hover:underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}

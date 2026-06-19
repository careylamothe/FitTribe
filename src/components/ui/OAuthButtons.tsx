"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function OAuthButtons() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  async function handleSignIn(provider: "google" | "github") {
    setLoadingProvider(provider);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => handleSignIn("google")}
        disabled={loadingProvider !== null}
        className="w-full rounded-lg border-2 border-ink bg-zest py-2.5 text-sm font-medium text-ink transition hover:bg-zest-dark disabled:opacity-50"
      >
        {loadingProvider === "google" ? "Redirecting…" : "Continue with Google"}
      </button>
      <button
        type="button"
        onClick={() => handleSignIn("github")}
        disabled={loadingProvider !== null}
        className="w-full rounded-lg border-2 border-ink bg-zest py-2.5 text-sm font-medium text-ink transition hover:bg-zest-dark disabled:opacity-50"
      >
        {loadingProvider === "github" ? "Redirecting…" : "Continue with GitHub"}
      </button>
    </div>
  );
}

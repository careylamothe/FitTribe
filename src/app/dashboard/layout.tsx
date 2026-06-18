import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Defense in depth: middleware already gates this route, but server
  // components should never trust that alone.
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between border-b border-border px-8 py-4">
        <div className="text-lg font-bold">
          Fit<span className="text-lime">Tribe</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-neutral-400">
          <Link href="/dashboard" className="hover:text-lime">
            Dashboard
          </Link>
          <Link href="/dashboard/calendar" className="hover:text-lime">
            Calendar
          </Link>
          <Link href="/dashboard/chat" className="hover:text-lime">
            Tribe Chat
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="rounded-lg border border-border px-3 py-1.5 hover:border-lime">
              Log out
            </button>
          </form>
        </div>
      </nav>
      <main className="px-8 py-8">{children}</main>
    </div>
  );
}

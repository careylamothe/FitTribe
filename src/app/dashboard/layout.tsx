import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <nav className="flex items-center justify-between border-b-2 border-ink/10 bg-canvas px-8 py-4">
        <div className="text-lg font-bold">
          Fit<span className="text-punch">Tribe</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-ink-muted">
          <Link href="/dashboard" className="hover:text-punch">
            Dashboard
          </Link>
          <Link href="/dashboard/calendar" className="hover:text-punch">
            Calendar
          </Link>
          <Link href="/dashboard/chat" className="hover:text-punch">
            Tribe Chat
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="rounded-lg border-2 border-ink/20 px-3 py-1.5 hover:border-punch hover:text-punch">
              Log out
            </button>
          </form>
        </div>
      </nav>
      <main className="px-8 py-8">{children}</main>
    </div>
  );
}

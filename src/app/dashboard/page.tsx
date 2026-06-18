import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Welcome, {session?.user?.name ?? "there"}</h1>
      <p className="mt-2 text-neutral-400">
        This is your member dashboard. Head to your calendar to manage class bookings, or drop into
        the tribe chat to connect with other members.
      </p>
    </div>
  );
}

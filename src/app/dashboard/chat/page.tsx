import { auth } from "@/auth";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/types/database";

async function postMessage(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user) return;

  const body = (formData.get("body") as string)?.trim();
  if (!body) return;

  const supabase = getServerSupabaseClient();
  await supabase.from("chat_messages").insert({
    user_id: session.user.id,
    sender_name: session.user.name ?? "Member",
    body,
  });
}

export default async function ChatPage() {
  const supabase = getServerSupabaseClient();

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, user_id, sender_name, body, created_at")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<ChatMessage[]>();

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border border-border bg-bg-card p-6">
        <h2 className="text-lg font-bold">Post to the tribe</h2>
        <form action={postMessage} className="mt-4 flex flex-col gap-3">
          <textarea
            name="body"
            rows={3}
            required
            placeholder="What's on your mind?"
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-lime"
          />
          <button
            type="submit"
            className="self-start rounded-lg bg-lime px-4 py-2 text-sm font-bold text-black hover:bg-lime-dim"
          >
            Post
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-bg-card p-6">
        <h2 className="text-lg font-bold">Recent posts</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Live updates aren&apos;t wired up yet — this list refreshes on page load.
        </p>
        {!messages || messages.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">No posts yet — be the first to say hello.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {messages.map((message) => (
              <div key={message.id} className="py-3">
                <div className="text-xs font-semibold text-lime">
                  {message.sender_name} &middot; {new Date(message.created_at).toLocaleString()}
                </div>
                <p className="mt-1 text-sm">{message.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// src/lib/actions/participants.ts
"use server";

import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { Participant } from "@/types/participants";

// Service-role client bypasses RLS for server-side reads;
// INSERT/DELETE use the user's own auth context (see note below).
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Sign up ────────────────────────────────────────────────

export async function signUpForEvent(
  eventId: string
): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to join an event." };
  }

  const supabase = getServiceClient();

  const { error } = await supabase.from("event_participants").insert({
    event_id: eventId,
    user_id: session.user.id,
  });

  if (error) {
    // 23505 = unique_violation — already signed up
    if (error.code === "23505") {
      return { error: "You're already signed up for this event." };
    }
    console.error("[signUpForEvent]", error);
    return { error: "Could not sign you up. Please try again." };
  }

  revalidatePath("/dashboard/calendar");
  return { error: null };
}

// ── Cancel sign-up ─────────────────────────────────────────

export async function cancelSignUp(
  eventId: string
): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }

  const supabase = getServiceClient();

  const { error } = await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", session.user.id);

  if (error) {
    console.error("[cancelSignUp]", error);
    return { error: "Could not cancel your sign-up. Please try again." };
  }

  revalidatePath("/dashboard/calendar");
  return { error: null };
}

// ── Admin: remove any participant ──────────────────────────

export async function removeParticipant(
  eventId: string,
  userId: string
): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Only tribe leaders can remove participants." };
  }

  const supabase = getServiceClient();

  const { error } = await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) {
    console.error("[removeParticipant]", error);
    return { error: "Could not remove participant. Please try again." };
  }

  revalidatePath("/dashboard/calendar");
  return { error: null };
}

// ── Data fetching ──────────────────────────────────────────

export async function getEventParticipants(
  eventId: string
): Promise<Participant[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("event_participants")
    .select(`
      id,
      event_id,
      user_id,
      joined_at,
      users (
        id,
        name,
        email,
        image
      )
    `)
    .eq("event_id", eventId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("[getEventParticipants]", error);
    return [];
  }

  return (data as unknown as Participant[]) ?? [];
}

/**
 * Returns a map of eventId → participant count for a set of event IDs.
 * Used to show badge counts on the calendar grid without fetching full lists.
 */
export async function getParticipantCounts(
  eventIds: string[]
): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("event_participant_counts")   // the view created in SQL
    .select("event_id, participant_count")
    .in("event_id", eventIds);

  if (error) {
    console.error("[getParticipantCounts]", error);
    return {};
  }

  return Object.fromEntries(
    (data ?? []).map((row) => [row.event_id, Number(row.participant_count)])
  );
}

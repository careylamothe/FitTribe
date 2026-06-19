export interface Participant {
  id: string;
  event_id: string;
  user_id: string;
  joined_at: string;
  users: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

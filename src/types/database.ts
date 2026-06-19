export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_date_start_time: string   
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  sender_name: string;
  body: string;
  created_at: string;
}
import { supabase } from '../lib/supabase';

export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled';
export interface BookingRequest {
  id: string; profile_id: string; block_id: string; form_submission_id: string;
  requested_start: string; duration_minutes: number; requester_email: string;
  requester_name?: string | null; details?: { requestedDate?: string; requestedTime?: string; data?: Record<string, string> };
  status: BookingStatus; created_at: string; updated_at: string;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  if (!supabase) throw new Error('Booking management requires a signed-in Supabase workspace.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in again to manage bookings.');
  return fetch(path, { ...init, headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json', ...(init?.headers || {}) } });
}

async function failure(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => ({})) as { error?: string | { message?: string } };
  const message = typeof body.error === 'string' ? body.error : body.error?.message;
  return new Error(message || fallback);
}

export async function loadBookingRequests(profileId: string): Promise<BookingRequest[]> {
  const response = await request(`/api/bookings?profileId=${encodeURIComponent(profileId)}`);
  if (!response.ok) throw await failure(response, 'Unable to load booking requests.');
  const body = await response.json() as { data?: BookingRequest[] };
  return Array.isArray(body.data) ? body.data : [];
}

export async function updateBookingRequest(id: string, status: Exclude<BookingStatus, 'pending'>): Promise<void> {
  const response = await request(`/api/bookings/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  if (!response.ok) throw await failure(response, 'Unable to update booking request.');
}

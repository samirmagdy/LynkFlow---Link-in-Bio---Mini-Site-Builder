import { FormBlockPayload } from '../types';

export async function submitPublicForm(input: {
  profileId: string;
  blockId: string;
  formTitle: string;
  formPayload: FormBlockPayload;
  data: Record<string, string>;
  consentGiven: boolean;
  honeypotTrap?: string;
  idempotencyKey?: string;
}): Promise<{ success: boolean; submissionId?: string; error?: string; fieldErrors?: Record<string, string>; rateLimited?: boolean }> {
  const response = await fetch('/api/public/forms', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(input.idempotencyKey ? { 'idempotency-key': input.idempotencyKey } : {}) },
    body: JSON.stringify(input),
  });
  const body = await response.json() as { success?: boolean; submissionId?: string; error?: string; fieldErrors?: Record<string, string>; rateLimited?: boolean };
  return { ...body, success: Boolean(response.ok && body.success) };
}

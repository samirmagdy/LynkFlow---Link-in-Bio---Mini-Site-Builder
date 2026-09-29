export async function submitPublicAbuseReport(input: {
  profileUsername: string;
  reason: 'spam' | 'phishing' | 'copyright' | 'harmful';
  description: string;
  reporterEmail?: string;
}): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('/api/public/abuse-reports', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input)
  });
  const body = await response.json() as { error?: string };
  return { success: response.ok, ...(body.error ? { error: body.error } : {}) };
}

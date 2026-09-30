type PexelsMediaType = 'photos' | 'videos';
type PexelsVideoFile = { file_type?: string; link?: string; width?: number; height?: number };
type PexelsItem = {
  id?: string | number;
  video_files?: PexelsVideoFile[];
  image?: string;
  width?: number;
  height?: number;
  duration?: number;
  user?: { name?: string; url?: string };
  url?: string;
  src?: { original?: string; large2x?: string; large?: string; medium?: string };
  photographer?: string;
  photographer_url?: string;
};
type PexelsPayload = { photos?: PexelsItem[]; videos?: PexelsItem[]; total_results?: number };

export interface PexelsEnvironment {
  PEXELS_API_KEY?: string;
}

type JsonResponse = (body: Record<string, unknown>, status?: number) => Response;

export async function searchPexelsMedia(request: Request, env: PexelsEnvironment, json: JsonResponse): Promise<Response> {
  if (!env.PEXELS_API_KEY) return json({ error: 'Pexels is not configured.' }, 503);
  const params = new URL(request.url).searchParams;
  const type: PexelsMediaType = params.get('type') === 'videos' ? 'videos' : 'photos';
  const query = (params.get('query') || '').trim().slice(0, 80);
  const page = clampInteger(params.get('page'), 1, 50, 1);
  const perPage = clampInteger(params.get('per_page'), 6, 24, 12);
  if (!query) return json({ error: 'A search query is required.' }, 400);

  const upstreamUrl = buildPexelsUrl(type, query, page, perPage);
  const cacheKey = new Request(upstreamUrl, { method: 'GET' });
  const cache = typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }).default || null : null;
  const cached = cache ? await cache.match(cacheKey) : null;
  if (cached) return cached;

  const upstream = await fetch(upstreamUrl, { headers: { Authorization: env.PEXELS_API_KEY, accept: 'application/json' } });
  if (!upstream.ok) return upstream.status === 429 ? json({ error: 'Pexels rate limit reached. Try again shortly.' }, 429) : json({ error: 'Pexels search failed.' }, 502);

  const payload = await upstream.json() as PexelsPayload;
  const items = type === 'videos' ? payload.videos || [] : payload.photos || [];
  const results = items.map(item => type === 'videos' ? normalizeVideo(item) : normalizePhoto(item)).filter((item): item is PexelsResult => Boolean(item.assetUrl));
  const response = new Response(JSON.stringify({ page, perPage, totalResults: payload.total_results || results.length, results }), { headers: { 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'public, max-age=86400, s-maxage=86400' } });
  if (cache) await cache.put(cacheKey, response.clone());
  return response;
}

interface PexelsResult {
  id: string;
  kind: 'image' | 'video';
  assetUrl: string | null;
  thumbnail: string | null;
  width: number | null;
  height: number | null;
  duration?: number | null;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
}

function clampInteger(value: string | null, min: number, max: number, fallback: number): number {
  const parsed = Number(value || fallback);
  return Math.max(min, Math.min(max, Number.isFinite(parsed) ? Math.trunc(parsed) : fallback));
}

function buildPexelsUrl(type: PexelsMediaType, query: string, page: number, perPage: number): string {
  const endpoint = type === 'videos' ? 'https://api.pexels.com/v1/videos/search' : 'https://api.pexels.com/v1/search';
  const url = new URL(endpoint);
  url.searchParams.set('query', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));
  if (type === 'videos') url.searchParams.set('size', 'medium');
  return url.toString();
}

function normalizeVideo(item: PexelsItem): PexelsResult {
  const files = (item.video_files || []).filter(file => file.file_type === 'video/mp4' && file.link);
  const selected = files.sort((a, b) => (Number(a.width || 9999) - Number(b.width || 9999)) || (Number(b.height || 0) - Number(a.height || 0)))[0];
  return { id: String(item.id || ''), kind: 'video', assetUrl: selected?.link || null, thumbnail: item.image || null, width: selected?.width || item.width || null, height: selected?.height || item.height || null, duration: item.duration || null, photographer: item.user?.name || 'Pexels creator', photographerUrl: item.user?.url || 'https://www.pexels.com', sourceUrl: item.url || 'https://www.pexels.com' };
}

function normalizePhoto(item: PexelsItem): PexelsResult {
  return { id: String(item.id || ''), kind: 'image', assetUrl: item.src?.original || item.src?.large2x || item.src?.large || null, thumbnail: item.src?.medium || item.src?.large || null, width: item.width || null, height: item.height || null, photographer: item.photographer || 'Pexels creator', photographerUrl: item.photographer_url || 'https://www.pexels.com', sourceUrl: item.url || 'https://www.pexels.com' };
}

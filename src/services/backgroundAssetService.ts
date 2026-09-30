import { supabase } from '../lib/supabase';

const BUCKET = 'profile-backgrounds';
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 60;
const MIN_DIMENSION = 640;
const MAX_IMAGE_DIMENSION = 4096;
const IMAGE_TARGET_DIMENSION = 2400;
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime'
]);

export interface BackgroundUploadResult {
  assetId: string;
  assetUrl: string;
  kind: 'image' | 'video';
  placeholderUrl?: string;
}

export interface BackgroundAsset {
  id: string;
  profileId?: string | null;
  storagePath: string;
  assetUrl: string;
  kind: 'image' | 'video';
  mimeType: string;
  byteSize: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  source: 'upload' | 'pexels';
  sourceUrl?: string | null;
  photographer?: string | null;
  createdAt: string;
}

export interface RemoteBackgroundAssetInput {
  id: number;
  kind: 'image' | 'video';
  assetUrl: string;
  sourceUrl?: string | null;
  photographer?: string | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
}

const inspectMediaFile = (file: File): Promise<{ width: number; height: number; durationSeconds?: number }> => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const isVideo = file.type.startsWith('video/');
  const media = document.createElement(isVideo ? 'video' : 'img');
  if (isVideo) (media as HTMLVideoElement).preload = 'metadata';
  const cleanup = () => URL.revokeObjectURL(url);
  const handleLoaded = () => {
    const width = isVideo ? (media as HTMLVideoElement).videoWidth : (media as HTMLImageElement).naturalWidth;
    const height = isVideo ? (media as HTMLVideoElement).videoHeight : (media as HTMLImageElement).naturalHeight;
    const duration = isVideo ? (media as HTMLVideoElement).duration : 0;
    cleanup();
    if (!width || !height) return reject(new Error('The background media dimensions could not be read.'));
    if (width < MIN_DIMENSION || height < MIN_DIMENSION) return reject(new Error(`Background media must be at least ${MIN_DIMENSION}×${MIN_DIMENSION}px.`));
    if (!isVideo && (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION)) return reject(new Error(`Background images must be ${MAX_IMAGE_DIMENSION}px or smaller on each side.`));
    const ratio = width / height;
    if (ratio < 0.3 || ratio > 3.5) return reject(new Error('Use a background aspect ratio between 3:10 and 10:3.'));
    if (isVideo && (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_SECONDS)) return reject(new Error(`Background videos must be ${MAX_VIDEO_SECONDS} seconds or shorter.`));
    resolve({ width, height, ...(isVideo ? { durationSeconds: duration } : {}) });
  };
  if (isVideo) {
    media.onloadedmetadata = handleLoaded;
  } else {
    (media as HTMLImageElement).onload = handleLoaded;
  }
  media.onerror = () => { cleanup(); reject(new Error('The selected background media could not be decoded.')); };
  media.src = url;
});

const prepareImageUpload = async (file: File): Promise<{ file: File; placeholderUrl: string }> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_TARGET_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Your browser could not prepare this background image.');
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const compressedBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
  const placeholderCanvas = document.createElement('canvas');
  const placeholderScale = Math.min(1, 32 / Math.max(width, height));
  placeholderCanvas.width = Math.max(1, Math.round(width * placeholderScale));
  placeholderCanvas.height = Math.max(1, Math.round(height * placeholderScale));
  const placeholderContext = placeholderCanvas.getContext('2d');
  if (!placeholderContext) throw new Error('Your browser could not prepare a background placeholder.');
  placeholderContext.drawImage(canvas, 0, 0, placeholderCanvas.width, placeholderCanvas.height);
  const placeholderUrl = placeholderCanvas.toDataURL('image/jpeg', 0.45);
  const output = compressedBlob && compressedBlob.size < file.size
    ? new File([compressedBlob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' })
    : file;
  return { file: output, placeholderUrl };
};

export async function uploadBackgroundAsset(file: File, profileId: string): Promise<BackgroundUploadResult> {
  if (!supabase) throw new Error('Supabase Storage is not configured.');
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Use JPG, PNG, WebP, GIF, AVIF, MP4, WebM, or MOV files.');
  if (file.size > MAX_BYTES) throw new Error('Background files must be 50 MB or smaller.');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Sign in before uploading a background asset.');

  // Inspect the original before downscaling so oversized source files cannot
  // bypass the dimension guard during compression.
  const originalDimensions = await inspectMediaFile(file);
  const prepared = file.type.startsWith('image/') ? await prepareImageUpload(file) : { file, placeholderUrl: undefined };
  const uploadFile = prepared.file;
  const extension = uploadFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'asset';
  const assetId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${userData.user.id}/${profileId}/${assetId}.${extension}`;
  const dimensions = file.type.startsWith('image/') ? originalDimensions : await inspectMediaFile(uploadFile);
  const { error } = await supabase.storage.from(BUCKET).upload(path, uploadFile, {
    contentType: uploadFile.type,
    cacheControl: '31536000',
    upsert: false
  });
  if (error) throw new Error(error.message || 'Background upload failed.');

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error('Background uploaded, but its public URL could not be created.');
  const { error: metadataError } = await supabase.from('background_assets').insert({
    id: assetId,
    workspace_id: userData.user.id,
    profile_id: profileId,
    storage_path: path,
    asset_url: data.publicUrl,
    kind: uploadFile.type.startsWith('video/') ? 'video' : 'image',
    mime_type: uploadFile.type,
    byte_size: uploadFile.size,
    width: dimensions.width,
    height: dimensions.height,
    duration_seconds: dimensions.durationSeconds || null,
    source: 'upload',
  });
  if (metadataError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(metadataError.message || 'Background asset metadata could not be saved.');
  }
  return { assetId: path, assetUrl: data.publicUrl, kind: uploadFile.type.startsWith('video/') ? 'video' : 'image', placeholderUrl: prepared.placeholderUrl };
}

export async function listBackgroundAssets(profileId?: string): Promise<BackgroundAsset[]> {
  if (!supabase) return [];
  let query = supabase.from('background_assets').select('*').order('created_at', { ascending: false });
  if (profileId) query = query.or(`profile_id.eq.${profileId},profile_id.is.null`);
  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Background asset library could not be loaded.');
  return (data || []).map((row: any) => ({
    id: row.id,
    profileId: row.profile_id,
    storagePath: row.storage_path,
    assetUrl: row.asset_url,
    kind: row.kind,
    mimeType: row.mime_type,
    byteSize: Number(row.byte_size || 0),
    width: row.width,
    height: row.height,
    durationSeconds: row.duration_seconds,
    source: row.source,
    sourceUrl: row.source_url,
    photographer: row.photographer,
    createdAt: row.created_at,
  }));
}

/** Register a remote provider asset so a selected Pexels result is durable and reusable. */
export async function registerRemoteBackgroundAsset(input: RemoteBackgroundAssetInput, profileId: string): Promise<BackgroundAsset> {
  if (!supabase) throw new Error('Supabase Storage is not configured.');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Sign in before saving a remote background asset.');
  if (!input.assetUrl || !input.id || !profileId) throw new Error('The selected background asset is incomplete.');

  const storagePath = `pexels:${input.kind}:${input.id}`;
  const row = {
    id: storagePath,
    workspace_id: userData.user.id,
    profile_id: profileId,
    storage_path: storagePath,
    asset_url: input.assetUrl,
    kind: input.kind,
    mime_type: input.kind === 'video' ? 'video/mp4' : 'image/jpeg',
    byte_size: 0,
    width: input.width || null,
    height: input.height || null,
    duration_seconds: input.durationSeconds || null,
    source: 'pexels',
    source_url: input.sourceUrl || 'https://www.pexels.com',
    photographer: input.photographer || 'Pexels creator',
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('background_assets').upsert(row, { onConflict: 'storage_path' }).select('*').single();
  if (error || !data) throw new Error(error?.message || 'Remote background asset could not be saved.');
  return {
    id: data.id,
    profileId: data.profile_id,
    storagePath: data.storage_path,
    assetUrl: data.asset_url,
    kind: data.kind,
    mimeType: data.mime_type,
    byteSize: Number(data.byte_size || 0),
    width: data.width,
    height: data.height,
    durationSeconds: data.duration_seconds,
    source: data.source,
    sourceUrl: data.source_url,
    photographer: data.photographer,
    createdAt: data.created_at,
  };
}

export async function removeBackgroundAsset(assetId: string): Promise<void> {
  if (!supabase || !assetId) return;
  if (!assetId.startsWith('pexels:')) {
    const { error } = await supabase.storage.from(BUCKET).remove([assetId]);
    if (error) throw new Error(error.message || 'Background asset removal failed.');
  }
  const { error: metadataError } = await supabase.from('background_assets').delete().eq('storage_path', assetId);
  if (metadataError) throw new Error(metadataError.message || 'Background asset metadata removal failed.');
}

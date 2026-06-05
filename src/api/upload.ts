import { getToken } from '../lib/api';
import { getApiBaseUrl } from '../lib/api-base';
import { compressImageForUpload } from '../lib/compressImageForUpload';

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

export interface UploadImageResponse {
  url: string;
}

interface ImageKitAuthResponse {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
}

async function uploadViaBackendProxy(file: File): Promise<UploadImageResponse> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getApiBaseUrl()}/api/admin/upload-image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string }).error ?? res.statusText;
    throw new Error(message);
  }
  return body as UploadImageResponse;
}

/**
 * Upload image to ImageKit.
 * 1) Tries direct browser → ImageKit (fast when your API is far away).
 * 2) Falls back to POST through your API if auth is unavailable or direct upload fails.
 */
async function fetchUploadAuth(base: string, authHeader: string | undefined): Promise<ImageKitAuthResponse | null> {
  try {
    const authRes = await fetch(`${base}/api/admin/upload-image-auth`, {
      headers: authHeader ? { Authorization: authHeader } : {},
    });
    if (!authRes.ok) return null;
    return (await authRes.json()) as ImageKitAuthResponse;
  } catch {
    return null;
  }
}

export async function uploadImage(file: File): Promise<UploadImageResponse> {
  const authToken = getToken();
  const base = getApiBaseUrl();
  const authHeader = authToken ? `Bearer ${authToken}` : undefined;

  const [prepared, auth] = await Promise.all([
    compressImageForUpload(file),
    fetchUploadAuth(base, authHeader),
  ]);

  if (auth?.publicKey && auth.signature && auth.token) {
    const ext = prepared.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const form = new FormData();
    form.append('file', prepared);
    form.append('fileName', fileName);
    form.append('folder', '/admin');
    form.append('signature', auth.signature);
    form.append('expire', String(auth.expire));
    form.append('token', auth.token);
    form.append('publicKey', auth.publicKey);
    form.append('useUniqueFileName', 'true');

    try {
      const upRes = await fetch(IMAGEKIT_UPLOAD_URL, {
        method: 'POST',
        body: form,
      });
      const data = (await upRes.json()) as { url?: string; message?: string };
      if (upRes.ok && data.url) {
        return { url: data.url };
      }
      console.warn('ImageKit direct upload failed, using server proxy:', data.message ?? upRes.status);
    } catch (e) {
      console.warn('ImageKit direct upload error, using server proxy:', e);
    }
  }

  return uploadViaBackendProxy(prepared);
}

/** Upload a GLB 3D model via the API proxy to ImageKit. */
export async function uploadModel(file: File): Promise<UploadImageResponse> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'glb' && file.type !== 'model/gltf-binary') {
    throw new Error('Only GLB files are allowed');
  }
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getApiBaseUrl()}/api/admin/upload-model`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string }).error ?? res.statusText;
    throw new Error(message);
  }
  return body as UploadImageResponse;
}

/** Upload a video (MP4, WebM, MOV) via the API proxy to ImageKit. */
export async function uploadVideo(file: File): Promise<UploadImageResponse> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const allowed = ['mp4', 'webm', 'mov', 'ogg'];
  if (!file.type.startsWith('video/') && (!ext || !allowed.includes(ext))) {
    throw new Error('Only MP4, WebM, or MOV video files are allowed');
  }
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getApiBaseUrl()}/api/admin/upload-video`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string }).error ?? res.statusText;
    throw new Error(message);
  }
  return body as UploadImageResponse;
}

/** Upload a PDF (e.g. product brochure) via the API proxy to ImageKit. */
export async function uploadDocument(file: File): Promise<UploadImageResponse> {
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getApiBaseUrl()}/api/admin/upload-document`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: string }).error ?? res.statusText;
    throw new Error(message);
  }
  return body as UploadImageResponse;
}

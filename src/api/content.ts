import { request } from '../lib/api';

export interface ContentItem {
  key: string;
  value: string;
  type?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ContentListResponse {
  items: ContentItem[];
  total: number;
  limit: number;
  skip: number;
}

export function listContent(params?: {
  limit?: number;
  skip?: number;
}): Promise<ContentListResponse> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.skip != null) sp.set('skip', String(params.skip));
  const q = sp.toString();
  return request<ContentListResponse>(`/api/admin/content${q ? `?${q}` : ''}`);
}

export function getContentByKey(key: string): Promise<ContentItem> {
  return request<ContentItem>(`/api/admin/content/${encodeURIComponent(key)}`);
}

export function updateContent(
  key: string,
  body: { value: string; type?: 'text' | 'image' | 'video' }
): Promise<ContentItem> {
  return request<ContentItem>(`/api/admin/content/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteContent(key: string): Promise<void> {
  return request<void>(`/api/admin/content/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
}

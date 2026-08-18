import { request } from '../lib/api';

export interface ContactSubmissionItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface ContactSubmissionsListResponse {
  items: ContactSubmissionItem[];
  total: number;
  limit: number;
  skip: number;
}

export function listContactSubmissions(params?: {
  limit?: number;
  skip?: number;
}): Promise<ContactSubmissionsListResponse> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.skip != null) sp.set('skip', String(params.skip));
  const q = sp.toString();
  return request<ContactSubmissionsListResponse>(`/api/admin/contact-submissions${q ? `?${q}` : ''}`);
}

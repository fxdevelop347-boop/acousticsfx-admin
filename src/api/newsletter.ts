import { request } from '../lib/api';

export interface NewsletterSubscriptionItem {
  _id: string;
  email: string;
  createdAt: string;
}

export interface NewsletterSubscriptionsListResponse {
  items: NewsletterSubscriptionItem[];
  total: number;
  limit: number;
  skip: number;
}

export function listNewsletterSubscriptions(params?: {
  limit?: number;
  skip?: number;
}): Promise<NewsletterSubscriptionsListResponse> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.skip != null) sp.set('skip', String(params.skip));
  const q = sp.toString();
  return request<NewsletterSubscriptionsListResponse>(`/api/admin/newsletter-subscriptions${q ? `?${q}` : ''}`);
}

export function addNewsletterSubscription(data: { email: string }): Promise<{ ok: boolean; message: string; error?: string }> {
  return request<{ ok: boolean; message: string; error?: string }>('/api/newsletter', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

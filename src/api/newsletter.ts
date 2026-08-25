import { request } from '../lib/api';

export type NewsletterStatus = 'active' | 'unsubscribed' | 'bounced';

export interface NewsletterSubscriptionItem {
  _id: string;
  email: string;
  createdAt: string;
  status: NewsletterStatus;
}

export interface NewsletterSubscriptionsListResponse {
  items: NewsletterSubscriptionItem[];
  total: number;
  /** Subscribers who have not opted out — the real reach of a send-to-all. */
  activeTotal: number;
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

export function deleteNewsletterSubscription(id: string): Promise<void> {
  return request<void>(`/api/admin/newsletter-subscriptions/${id}`, { method: 'DELETE' });
}

export function deleteNewsletterSubscriptions(
  ids: string[]
): Promise<{ ok: boolean; deletedCount: number }> {
  return request<{ ok: boolean; deletedCount: number }>(
    '/api/admin/newsletter-subscriptions/bulk-delete',
    { method: 'POST', body: JSON.stringify({ ids }) }
  );
}

export interface SendNewsletterPayload {
  subject: string;
  html: string;
  /** Ignored when testEmail is set. */
  sendToAll?: boolean;
  recipientIds?: string[];
  /** When set, the campaign goes to this one address only and is not recorded. */
  testEmail?: string;
}

export interface SendNewsletterResponse {
  ok: boolean;
  test: boolean;
  total: number;
  sent: number;
  failed: number;
  campaignId?: string;
}

export function sendNewsletter(payload: SendNewsletterPayload): Promise<SendNewsletterResponse> {
  return request<SendNewsletterResponse>('/api/admin/newsletter/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

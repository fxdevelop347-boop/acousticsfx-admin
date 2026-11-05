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
  /** Who the send did not reach and why (capped by the server). */
  failures?: { email: string; reason: string | null }[];
  /** The mail provider's reason for the first failure. */
  error?: string;
  campaignId?: string;
}

export function sendNewsletter(payload: SendNewsletterPayload): Promise<SendNewsletterResponse> {
  return request<SendNewsletterResponse>('/api/admin/newsletter/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateNewsletterSubscriptionEmail(
  id: string,
  email: string
): Promise<{ ok: boolean; email: string }> {
  return request<{ ok: boolean; email: string }>(`/api/admin/newsletter-subscriptions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ email }),
  });
}

export interface NewsletterCampaignSummary {
  _id: string;
  subject: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentByEmail: string;
  createdAt: string;
  lastResendAt: string | null;
}

export interface NewsletterCampaignFailure {
  /** The address the send was attempted at. */
  email: string;
  /** Null on sends made before reasons were recorded. */
  reason: string | null;
  /** Null once the subscriber has been removed from the list. */
  subscriptionId: string | null;
  /** The subscriber's address now, which differs from `email` after a correction. */
  currentEmail: string | null;
  status: NewsletterStatus | 'removed';
}

export interface NewsletterCampaignDetail extends NewsletterCampaignSummary {
  failures: NewsletterCampaignFailure[];
}

export interface ResendFailedResponse {
  ok: boolean;
  total: number;
  sent: number;
  failed: number;
  error?: string;
  failures: NewsletterCampaignFailure[];
}

export function listNewsletterCampaigns(params: { limit: number; skip: number }): Promise<{
  items: NewsletterCampaignSummary[];
  total: number;
  limit: number;
  skip: number;
}> {
  return request(`/api/admin/newsletter/campaigns?limit=${params.limit}&skip=${params.skip}`);
}

export function getNewsletterCampaign(id: string): Promise<NewsletterCampaignDetail> {
  return request<NewsletterCampaignDetail>(`/api/admin/newsletter/campaigns/${id}`);
}

export function resendFailedNewsletter(id: string): Promise<ResendFailedResponse> {
  return request<ResendFailedResponse>(`/api/admin/newsletter/campaigns/${id}/resend-failed`, {
    method: 'POST',
  });
}

import { request } from '../lib/api';

export interface CaseStudyMetric {
  value: string;
  label: string;
}

export interface CaseStudyGalleryImage {
  url: string;
  caption?: string;
}

export interface CaseStudyQuote {
  text: string;
  author?: string;
  role?: string;
}

export interface CaseStudyItem {
  _id: string;
  slug: string;
  title: string;
  /** Teaser shown on listing cards. */
  description: string;
  /** Hero image. */
  image: string;
  order: number;

  client?: string;
  industry?: string;
  location?: string;
  year?: string;

  challenge?: string;
  solution?: string;
  results?: string;

  metrics?: CaseStudyMetric[];
  gallery?: CaseStudyGalleryImage[];
  productsUsed?: string[];
  quote?: CaseStudyQuote;

  /** Absent counts as published, for records created before this field existed. */
  isPublished?: boolean;
  isFeatured?: boolean;
  metaDescription?: string;

  createdAt?: string;
  updatedAt?: string;
}

/** Everything the form submits. The server treats absent optional fields as cleared. */
export type CaseStudyPayload = Omit<CaseStudyItem, '_id' | 'createdAt' | 'updatedAt'>;

export interface CaseStudyListResponse {
  items: CaseStudyItem[];
}

export function listCaseStudies(): Promise<CaseStudyListResponse> {
  return request<CaseStudyListResponse>('/api/admin/case-studies');
}

export function createCaseStudy(body: CaseStudyPayload): Promise<CaseStudyItem> {
  return request<CaseStudyItem>('/api/admin/case-studies', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateCaseStudy(id: string, body: CaseStudyPayload): Promise<CaseStudyItem> {
  return request<CaseStudyItem>(`/api/admin/case-studies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteCaseStudy(id: string): Promise<void> {
  return request<void>(`/api/admin/case-studies/${id}`, { method: 'DELETE' });
}

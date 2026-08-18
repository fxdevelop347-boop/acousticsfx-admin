import { request } from '../lib/api';

export interface CaseStudyItem {
  _id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CaseStudyListResponse {
  items: CaseStudyItem[];
}

export function listCaseStudies(): Promise<CaseStudyListResponse> {
  return request<CaseStudyListResponse>('/api/admin/case-studies');
}

export function createCaseStudy(body: {
  slug: string;
  title: string;
  description: string;
  image: string;
  order?: number;
}): Promise<CaseStudyItem> {
  return request<CaseStudyItem>('/api/admin/case-studies', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateCaseStudy(
  id: string,
  body: { slug: string; title: string; description: string; image: string; order?: number }
): Promise<CaseStudyItem> {
  return request<CaseStudyItem>(`/api/admin/case-studies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteCaseStudy(id: string): Promise<void> {
  return request<void>(`/api/admin/case-studies/${id}`, { method: 'DELETE' });
}

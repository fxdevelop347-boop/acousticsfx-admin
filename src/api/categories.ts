import { request } from '../lib/api';

/** Products whose `categorySlug` matches this category (from GET list only). */
export interface CategoryLinkedProduct {
  slug: string;
  title: string;
}

export interface CategoryItem {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  heroImage?: string;
  heroHeading?: string;
  heroDescription?: string;
  order: number;
  tagline?: string;
  metaTitle?: string;
  metaDescription?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Populated on admin list; assign products under Products → Category field. */
  linkedProducts?: CategoryLinkedProduct[];
}

export interface CategoryListResponse {
  items: CategoryItem[];
}

export function listCategories(): Promise<CategoryListResponse> {
  return request<CategoryListResponse>('/api/admin/categories');
}

export function createCategory(body: {
  slug: string;
  name: string;
  description?: string;
  image?: string;
  heroImage?: string;
  heroHeading?: string;
  heroDescription?: string;
  order?: number;
  tagline?: string;
  metaTitle?: string;
  metaDescription?: string;
}): Promise<CategoryItem> {
  return request<CategoryItem>('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateCategory(
  id: string,
  body: {
    slug: string;
    name: string;
    description?: string;
    image?: string;
    heroImage?: string;
    heroHeading?: string;
    heroDescription?: string;
    order?: number;
    tagline?: string;
    metaTitle?: string;
    metaDescription?: string;
  }
): Promise<CategoryItem> {
  return request<CategoryItem>(`/api/admin/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteCategory(id: string): Promise<void> {
  return request<void>(`/api/admin/categories/${id}`, {
    method: 'DELETE',
  });
}

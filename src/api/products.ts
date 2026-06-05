import { request } from '../lib/api';

/** Single spec row (label / value) */
export interface SubProductSpec {
  label: string;
  value: string;
}

/** Image + label within one 3D visualizer item. */
export interface VisualizerItemProfile {
  name: string;
  image: string;
}

/** One 3D visualizer entry — thumbnail + GLB. */
export interface VisualizerItem {
  name: string;
  thumbnail: string;
  glb: string;
  description?: string;
  profiles?: VisualizerItemProfile[];
}

/** Legacy — used when loading old products in admin. */
export interface VisualizerHoleProfile {
  name: string;
  hole: number;
  spacing: number;
  thumbnail?: string;
  glb?: string;
}

export interface VisualizerTexture {
  name: string;
  image: string;
  profiles: VisualizerHoleProfile[];
}

export interface SubProductGallerySlide {
  large: string;
  small: string;
}

export interface SubProductGalleryImage {
  url: string;
  alt?: string;
}

export interface SubProductProfile {
  id?: string;
  name: string;
  size?: string;
  description?: string;
  image?: string;
}

export interface SubProductProfilesSection {
  title?: string;
  description?: string;
  profiles?: SubProductProfile[];
}

export interface SubProductSubstrateItem {
  name: string;
  thickness?: string;
  description?: string;
  image?: string;
}

export interface SubProductSubstratesSection {
  title?: string;
  description?: string;
  items?: SubProductSubstrateItem[];
}

export interface SubProductAboutTab {
  key: string;
  title: string;
  rows: string[];
}

export interface SubProductCertification {
  name: string;
  image: string;
  description?: string;
}

export interface SubProductFinishShade {
  name: string;
  description?: string;
  image: string;
}

export interface SubProductFinishesSection {
  title?: string;
  description?: string;
  items?: SubProductFinishShade[];
}

/** Flat product (detail page + listing) */
export interface ProductItem {
  _id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  heroImage?: string;
  categorySlug?: string;
  order: number;
  shortDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
  /** Public URL of product brochure PDF */
  brochureUrl?: string;
  showTrademark?: boolean;
  specSectionTitle?: string;
  specDescription?: string;
  specs?: SubProductSpec[];
  gallerySlides?: SubProductGallerySlide[];
  galleryImages?: SubProductGalleryImage[];
  profilesSection?: SubProductProfilesSection;
  substratesSection?: SubProductSubstratesSection;
  aboutTabs?: SubProductAboutTab[];
  certificationsSectionTitle?: string;
  certificationsSectionDescription?: string;
  certifications?: SubProductCertification[];
  finishesSection?: SubProductFinishesSection;
  visualizerTitle?: string;
  visualizerDescription?: string;
  visualizerItems?: VisualizerItem[];
  /** @deprecated Legacy nested format — migrated on load */
  visualizerTextures?: VisualizerTexture[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductListResponse {
  items: ProductItem[];
}

export type CreateProductBody = Omit<ProductItem, '_id' | 'createdAt' | 'updatedAt'>;

export type UpdateProductBody = CreateProductBody;

export function listProducts(): Promise<ProductListResponse> {
  return request<ProductListResponse>('/api/admin/products');
}

export function createProduct(body: CreateProductBody): Promise<ProductItem> {
  return request<ProductItem>('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateProduct(id: string, body: UpdateProductBody): Promise<ProductItem> {
  return request<ProductItem>(`/api/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteProduct(id: string): Promise<void> {
  return request<void>(`/api/admin/products/${id}`, {
    method: 'DELETE',
  });
}

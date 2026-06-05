import { useRef, useState } from 'react';
import { useProductsList } from '../hooks/useProductsList';
import { useCategoriesList } from '../hooks/useCategoriesList';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductItem,
  type CreateProductBody,
  type SubProductSpec,
  type SubProductGalleryImage,
  type SubProductSubstratesSection,
  type SubProductAboutTab,
  type SubProductFinishesSection,
  type SubProductCertification,
  type VisualizerItem,
  type VisualizerTexture,
} from '../api/products';
import { useQueryClient } from '@tanstack/react-query';
import type { CategoryItem } from '../api/categories';
import Modal from '../components/Modal';
import { ImageUploadField } from '../components/ImageUploadField';
import { inputClass, labelClass, cancelBtnClass, deleteBtnClass } from '../lib/styles';
import PageShell from '../components/PageShell';
import { EmptyState, ErrorState, InlineLoader } from '../components/EmptyState';
import { slugify } from '../lib/slugify';
import { uploadDocument, uploadImage, uploadModel } from '../api/upload';

type InlineImageSlot =
  | { kind: 'certification'; index: number }
  | { kind: 'substrate'; index: number }
  | { kind: 'finish'; index: number }
  | { kind: 'gallery'; index: number }
  | { kind: 'visualizerThumb'; index: number }
  | { kind: 'visualizerProfileImage'; itemIndex: number; profileIndex: number };

type NumericInputValue = number | '';

function parseNumericInput(value: string): NumericInputValue {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : '';
}

/** Coerce API/form values to trimmed strings (avoids .trim() on undefined). */
function str(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

const inlineUploadBtnClass =
  'py-1 px-2 text-xs font-medium text-primary-600 border border-primary-400 rounded-lg hover:bg-primary-50 disabled:opacity-50 shrink-0 cursor-pointer';

type VisProfileRow = { name: string; image: string };
type VisItemRow = {
  name: string;
  thumbnail: string;
  glb: string;
  description: string;
  profiles: VisProfileRow[];
};

function normalizeVisItems(
  items?: VisualizerItem[],
  legacy?: VisualizerTexture[]
): VisItemRow[] {
  if (items?.length) {
    return items.map((i) => ({
      name: i.name ?? '',
      thumbnail: i.thumbnail ?? '',
      glb: i.glb ?? '',
      description: i.description ?? '',
      profiles: (i.profiles ?? []).map((p) => ({
        name: p.name ?? '',
        image: p.image ?? '',
      })),
    }));
  }
  if (legacy?.length) {
    return legacy.flatMap((t) =>
      (t.profiles ?? []).map((p) => ({
        name: p.name?.trim() || t.name?.trim() || '',
        thumbnail: p.thumbnail?.trim() || t.image?.trim() || '',
        glb: p.glb?.trim() || '',
        description: '',
        profiles: [],
      }))
    );
  }
  return [];
}

function slotUploading(active: InlineImageSlot | null, match: InlineImageSlot): boolean {
  if (!active || active.kind !== match.kind) return false;
  if (match.kind === 'visualizerProfileImage') {
    return (
      active.kind === 'visualizerProfileImage' &&
      active.itemIndex === match.itemIndex &&
      active.profileIndex === match.profileIndex
    );
  }
  return 'index' in active && 'index' in match && active.index === match.index;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="m-0 mt-4 mb-2 text-sm font-semibold text-gray-600 border-b border-gray-200 pb-1 first:mt-0">
      {children}
    </h3>
  );
}

function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
  isSaving,
  error,
  hideTitle,
}: {
  product: ProductItem | null;
  categories: CategoryItem[];
  onSave: (body: CreateProductBody) => void;
  onCancel: () => void;
  isSaving: boolean;
  error: string | null;
  hideTitle?: boolean;
}) {
  const initial = product;
  const profilesSectionRef = useRef(initial?.profilesSection);

  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [showTrademark, setShowTrademark] = useState(initial?.showTrademark === true);
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [image, setImage] = useState(initial?.image ?? '');
  const [heroImage, setHeroImage] = useState(initial?.heroImage ?? '');
  const [brochureUrl, setBrochureUrl] = useState(initial?.brochureUrl ?? '');
  const [brochureUploading, setBrochureUploading] = useState(false);
  const brochureFileRef = useRef<HTMLInputElement>(null);
  const [categorySlug, setCategorySlug] = useState(initial?.categorySlug ?? '');
  const [order, setOrder] = useState<NumericInputValue>(initial?.order ?? 0);
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? '');

  const [specSectionTitle, setSpecSectionTitle] = useState(initial?.specSectionTitle ?? '');
  const [specDescription, setSpecDescription] = useState(initial?.specDescription ?? '');
  const [specs, setSpecs] = useState<SubProductSpec[]>(
    () => (initial?.specs ?? []).map((s) => ({ label: s.label ?? '', value: s.value ?? '' }))
  );
  const [certificationsSectionTitle, setCertificationsSectionTitle] = useState(
    initial?.certificationsSectionTitle ?? ''
  );
  const [certificationsSectionDescription, setCertificationsSectionDescription] = useState(
    initial?.certificationsSectionDescription ?? ''
  );
  const [certificationItems, setCertificationItems] = useState<SubProductCertification[]>(
    () =>
      (initial?.certifications ?? []).map((c) => ({
        name: c.name ?? '',
        image: c.image ?? '',
        description: c.description ?? '',
      }))
  );
  const [galleryImages, setGalleryImages] = useState<SubProductGalleryImage[]>(() => {
    const raw =
      initial?.galleryImages ??
      (initial?.gallerySlides?.length
        ? initial.gallerySlides.flatMap((s) => [
            { url: s.large ?? '', alt: '' },
            { url: s.small ?? '', alt: '' },
          ])
        : []);
    return raw
      .map((g) => ({ url: g.url ?? '', alt: g.alt ?? '' }))
      .filter((g) => g.url);
  });

  const inlineFileRef = useRef<HTMLInputElement>(null);
  const glbFileRef = useRef<HTMLInputElement>(null);
  const pendingInlineSlotRef = useRef<InlineImageSlot | null>(null);
  const pendingGlbIndexRef = useRef<number | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<InlineImageSlot | null>(null);
  const [uploadingGlbIndex, setUploadingGlbIndex] = useState<number | null>(null);

  type SubstrateItem = NonNullable<SubProductSubstratesSection['items']>[number];
  const [substratesTitle, setSubstratesTitle] = useState(initial?.substratesSection?.title ?? '');
  const [substratesDescription, setSubstratesDescription] = useState(
    initial?.substratesSection?.description ?? ''
  );
  const [substrateItems, setSubstrateItems] = useState<SubstrateItem[]>(
    () =>
      (initial?.substratesSection?.items ?? []).map((s) => ({
        name: s.name ?? '',
        thickness: s.thickness ?? '',
        description: s.description ?? '',
        image: s.image ?? '',
      }))
  );

  const aboutTabDefs: Array<Pick<SubProductAboutTab, 'key' | 'title'>> = [
    { key: 'advantages', title: 'Advantages' },
    { key: 'key-features', title: 'Key Features' },
    { key: 'application-areas', title: 'Application Areas' },
    { key: 'characteristics', title: 'Characteristics' },
    { key: 'maintenance', title: 'Maintenance' },
  ];
  const [aboutTabText, setAboutTabText] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const def of aboutTabDefs) {
      const existing =
        initial?.aboutTabs?.find((t) => t.key === def.key) ??
        initial?.aboutTabs?.find((t) => t.title === def.title);
      map[def.key] = existing?.rows?.join('\n') ?? '';
    }
    return map;
  });

  type FinishItem = NonNullable<SubProductFinishesSection['items']>[number];
  const [finishesTitle, setFinishesTitle] = useState(initial?.finishesSection?.title ?? '');
  const [finishesDescription, setFinishesDescription] = useState(
    initial?.finishesSection?.description ?? ''
  );
  const [finishItems, setFinishItems] = useState<FinishItem[]>(
    () =>
      (initial?.finishesSection?.items ?? []).map((f) => ({
        name: f.name ?? '',
        description: f.description ?? '',
        image: f.image ?? '',
      }))
  );

  const [visTitle, setVisTitle] = useState(initial?.visualizerTitle ?? '');
  const [visDesc, setVisDesc] = useState(initial?.visualizerDescription ?? '');
  const [visItems, setVisItems] = useState<VisItemRow[]>(() =>
    normalizeVisItems(initial?.visualizerItems, initial?.visualizerTextures)
  );

  const addSpec = () => setSpecs((prev) => [...prev, { label: '', value: '' }]);
  const updateSpec = (i: number, field: 'label' | 'value', value: string) => {
    setSpecs((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };
  const removeSpec = (i: number) => setSpecs((prev) => prev.filter((_, j) => j !== i));

  const addCertification = () =>
    setCertificationItems((prev) => [...prev, { name: '', image: '', description: '' }]);
  const updateCertification = <K extends keyof SubProductCertification>(
    i: number,
    field: K,
    value: SubProductCertification[K]
  ) => {
    setCertificationItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };
  const removeCertification = (i: number) =>
    setCertificationItems((prev) => prev.filter((_, idx) => idx !== i));

  const openInlineImagePicker = (slot: InlineImageSlot) => {
    pendingInlineSlotRef.current = slot;
    inlineFileRef.current?.click();
  };

  const handleInlineImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const slot = pendingInlineSlotRef.current;
    pendingInlineSlotRef.current = null;
    if (!file?.type.startsWith('image/') || !slot) return;

    setUploadingSlot(slot);
    try {
      const { url } = await uploadImage(file);
      switch (slot.kind) {
        case 'certification':
          setCertificationItems((prev) => {
            const next = [...prev];
            if (next[slot.index]) {
              next[slot.index] = { ...next[slot.index], image: url };
            }
            return next;
          });
          break;
        case 'substrate':
          setSubstrateItems((prev) => {
            const next = [...prev];
            if (next[slot.index]) {
              next[slot.index] = { ...next[slot.index], image: url };
            }
            return next;
          });
          break;
        case 'finish':
          setFinishItems((prev) => {
            const next = [...prev];
            if (next[slot.index]) {
              next[slot.index] = { ...next[slot.index], image: url };
            }
            return next;
          });
          break;
        case 'gallery':
          setGalleryImages((prev) => {
            const next = [...prev];
            if (next[slot.index]) {
              next[slot.index] = { ...next[slot.index], url };
            }
            return next;
          });
          break;
        case 'visualizerThumb':
          setVisItems((prev) => {
            const next = [...prev];
            if (next[slot.index]) {
              next[slot.index] = { ...next[slot.index], thumbnail: url };
            }
            return next;
          });
          break;
        case 'visualizerProfileImage':
          setVisItems((prev) => {
            const next = [...prev];
            const item = next[slot.itemIndex];
            if (!item?.profiles[slot.profileIndex]) return prev;
            const profiles = [...item.profiles];
            profiles[slot.profileIndex] = { ...profiles[slot.profileIndex], image: url };
            next[slot.itemIndex] = { ...item, profiles };
            return next;
          });
          break;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingSlot(null);
    }
  };

  const openGlbPicker = (index: number) => {
    pendingGlbIndexRef.current = index;
    glbFileRef.current?.click();
  };

  const handleGlbFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const index = pendingGlbIndexRef.current;
    pendingGlbIndexRef.current = null;
    if (!file || index === null) return;

    setUploadingGlbIndex(index);
    try {
      const { url } = await uploadModel(file);
      setVisItems((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index] = { ...next[index], glb: url };
        }
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'GLB upload failed');
    } finally {
      setUploadingGlbIndex(null);
    }
  };

  const addGalleryImage = () => setGalleryImages((prev) => [...prev, { url: '', alt: '' }]);
  const updateGalleryImage = (i: number, field: 'url' | 'alt', value: string) => {
    setGalleryImages((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };
  const removeGalleryImage = (i: number) => setGalleryImages((prev) => prev.filter((_, j) => j !== i));

  const addSubstrate = () =>
    setSubstrateItems((prev) => [...prev, { name: '', thickness: '', description: '', image: '' }]);
  const updateSubstrate = <K extends keyof SubstrateItem>(i: number, field: K, value: SubstrateItem[K]) => {
    setSubstrateItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };
  const removeSubstrate = (i: number) =>
    setSubstrateItems((prev) => prev.filter((_, idx) => idx !== i));

  const addFinish = () =>
    setFinishItems((prev) => [...prev, { name: '', description: '', image: '' }]);
  const updateFinish = <K extends keyof FinishItem>(i: number, field: K, value: FinishItem[K]) => {
    setFinishItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };
  const removeFinish = (i: number) => setFinishItems((prev) => prev.filter((_, idx) => idx !== i));

  const addVisItem = () =>
    setVisItems((prev) => [
      ...prev,
      { name: '', thumbnail: '', glb: '', description: '', profiles: [] },
    ]);
  const updateVisItem = <K extends keyof VisItemRow>(i: number, field: K, value: VisItemRow[K]) => {
    setVisItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };
  const removeVisItem = (i: number) => setVisItems((prev) => prev.filter((_, idx) => idx !== i));

  const addVisProfile = (itemIndex: number) => {
    setVisItems((prev) => {
      const next = [...prev];
      const item = next[itemIndex];
      if (!item) return prev;
      next[itemIndex] = {
        ...item,
        profiles: [...(item.profiles ?? []), { name: '', image: '' }],
      };
      return next;
    });
  };
  const updateVisProfile = (
    itemIndex: number,
    profileIndex: number,
    field: keyof VisProfileRow,
    value: string
  ) => {
    setVisItems((prev) => {
      const next = [...prev];
      const item = next[itemIndex];
      if (!item?.profiles[profileIndex]) return prev;
      const profiles = [...item.profiles];
      profiles[profileIndex] = { ...profiles[profileIndex], [field]: value };
      next[itemIndex] = { ...item, profiles };
      return next;
    });
  };
  const removeVisProfile = (itemIndex: number, profileIndex: number) => {
    setVisItems((prev) => {
      const next = [...prev];
      const item = next[itemIndex];
      if (!item) return prev;
      next[itemIndex] = {
        ...item,
        profiles: item.profiles.filter((_, j) => j !== profileIndex),
      };
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resolvedSlug = (str(slug) || slugify(str(title))).trim();
      if (!resolvedSlug) {
        alert('Title or URL slug is required.');
        return;
      }
      if (!str(title)) {
        alert('Title is required.');
        return;
      }
      if (!str(image)) {
        alert('Card / listing image is required.');
        return;
      }

    const aboutTabs: SubProductAboutTab[] =
      aboutTabDefs
        .map((def) => {
          const lines = (aboutTabText[def.key] ?? '')
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);
          if (!lines.length) return null;
          return { key: def.key, title: def.title, rows: lines };
        })
        .filter((t): t is SubProductAboutTab => !!t) ?? [];

    const substratesClean = substrateItems
      .map((s) => ({
        name: str(s.name),
        thickness: str(s.thickness) || undefined,
        description: str(s.description) || undefined,
        image: str(s.image) || undefined,
      }))
      .filter((s) => s.name);

    const finishesClean = finishItems
      .map((f) => ({
        name: str(f.name),
        description: str(f.description) || undefined,
        image: str(f.image),
      }))
      .filter((f) => f.name && f.image);

    const certificationsClean = certificationItems
      .map((c) => ({
        name: str(c.name),
        image: str(c.image),
        description: str(c.description) || undefined,
      }))
      .filter((c) => c.name && c.image);

    const visualizerItemsPayload = visItems
      .map((item) => {
        const profiles = (item.profiles ?? [])
          .map((p) => ({
            name: str(p.name),
            image: str(p.image),
          }))
          .filter((p) => p.name && p.image);
        return {
          name: str(item.name),
          thumbnail: str(item.thumbnail),
          glb: str(item.glb),
          description: str(item.description) || undefined,
          ...(profiles.length > 0 ? { profiles } : {}),
        };
      })
      .filter((item) => item.name && item.thumbnail && item.glb);

    const body: CreateProductBody = {
      slug: resolvedSlug,
      title: str(title),
      description: str(description),
      image: str(image),
      heroImage: str(heroImage) || undefined,
      brochureUrl: str(brochureUrl) || undefined,
      categorySlug: str(categorySlug) || undefined,
      order: typeof order === 'number' ? order : 0,
      shortDescription: str(shortDescription) || undefined,
      metaTitle: str(metaTitle) || undefined,
      metaDescription: str(metaDescription) || undefined,
      showTrademark,
      specSectionTitle: str(specSectionTitle),
      certificationsSectionTitle: str(certificationsSectionTitle),
      certificationsSectionDescription: str(certificationsSectionDescription),
      ...(str(specDescription) && { specDescription: str(specDescription) }),
      ...(specs.filter((s) => str(s.label) || str(s.value)).length > 0 && {
        specs: specs
          .filter((s) => str(s.label) || str(s.value))
          .map((s) => ({ label: str(s.label) || '—', value: str(s.value) || '—' })),
      }),
      galleryImages: galleryImages
        .filter((g) => str(g.url))
        .map((g) => ({
          url: str(g.url),
          alt: str(g.alt) || undefined,
        })),
      ...(aboutTabs.length > 0 && { aboutTabs }),
      ...((str(substratesTitle) ||
        str(substratesDescription) ||
        substratesClean.length > 0) && {
        substratesSection: {
          title: str(substratesTitle) || undefined,
          description: str(substratesDescription) || undefined,
          items: substratesClean,
        },
      }),
      ...((str(finishesTitle) ||
        str(finishesDescription) ||
        finishesClean.length > 0) && {
        finishesSection: {
          title: str(finishesTitle) || undefined,
          description: str(finishesDescription) || undefined,
          items: finishesClean,
        },
      }),
      certifications: certificationsClean,
      visualizerTitle: str(visTitle) || undefined,
      visualizerDescription: str(visDesc) || undefined,
      visualizerItems: visualizerItemsPayload,
    };

    if (profilesSectionRef.current) {
      body.profilesSection = profilesSectionRef.current;
    }

      onSave(body);
    } catch (err) {
      console.error('Product save failed:', err);
      alert(err instanceof Error ? err.message : 'Could not prepare product data for save.');
    }
  };

  const saveBlockedReason = !str(title)
    ? 'Title is required'
    : !str(image)
      ? 'Card / listing image is required'
      : null;

  return (
    <section className={hideTitle ? undefined : 'mb-6'}>
      {!hideTitle && (
        <h2 className="m-0 mb-4 text-base font-semibold text-gray-600">
          {product ? 'Edit product' : 'Add product'}
        </h2>
      )}
      {product?._id ? (
        <div className="rounded-lg border border-gray-200 bg-white p-3 mb-3">
          <p className="m-0 text-xs text-gray-500">Product ID</p>
          <p className="m-0 mt-1 font-mono text-sm text-gray-800">{product._id}</p>
        </div>
      ) : null}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <input
          ref={inlineFileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          className="hidden"
          onChange={handleInlineImageFile}
        />
        <input
          ref={glbFileRef}
          type="file"
          accept=".glb,model/gltf-binary"
          className="hidden"
          onChange={handleGlbFile}
        />
        <SectionHeading>Basic info</SectionHeading>
        <label>
          <span className={labelClass}>Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Linearlux"
            required
            className={inputClass}
          />
        </label>
        <label>
          <span className={labelClass}>URL slug</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={slugify(title) || 'from-title'}
            className={inputClass}
          />
          <p className="m-0 mt-1 text-xs text-gray-500">
            Public path: /products/[category]/<span className="font-mono">{slug.trim() || slugify(title) || '…'}</span>
          </p>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showTrademark}
            onChange={(e) => setShowTrademark(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className={labelClass}>Show ™ after product name on the website</span>
        </label>
        <label>
          <span className={labelClass}>Short description (optional)</span>
          <input
            type="text"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            className={inputClass}
          />
        </label>
        <label>
          <span className={labelClass}>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={`${inputClass} resize-y`}
          />
        </label>

        <SectionHeading>Media</SectionHeading>
        <ImageUploadField
          label="Card / listing image"
          hint="Required. Used on category grid."
          value={image}
          onChange={setImage}
        />
        <ImageUploadField
          label="Hero image (optional)"
          hint="Large hero on product detail page."
          value={heroImage}
          onChange={setHeroImage}
        />
        <div>
          <span className={labelClass}>Brochure PDF (optional)</span>
          <p className="m-0 mb-2 text-xs text-gray-500">
            Shown as &quot;Download brochure&quot; on the product page. Upload a PDF or paste a URL.
          </p>
          <input
            ref={brochureFileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file || file.type !== 'application/pdf') return;
              setBrochureUploading(true);
              try {
                const { url } = await uploadDocument(file);
                setBrochureUrl(url);
              } catch (err) {
                alert(err instanceof Error ? err.message : 'Upload failed');
              } finally {
                setBrochureUploading(false);
              }
            }}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={brochureUrl}
              onChange={(e) => setBrochureUrl(e.target.value)}
              placeholder="https://…"
              className={`${inputClass} flex-1 min-w-[200px]`}
            />
            <button
              type="button"
              disabled={brochureUploading}
              onClick={() => brochureFileRef.current?.click()}
              className={inlineUploadBtnClass}
            >
              {brochureUploading ? 'Uploading…' : 'Upload PDF'}
            </button>
            {brochureUrl.trim() ? (
              <button
                type="button"
                onClick={() => setBrochureUrl('')}
                className="text-xs text-gray-500 hover:text-red-600"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <SectionHeading>Category & order</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label>
            <span className={labelClass}>Category</span>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className={inputClass}
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c._id} value={c.slug}>
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Order</span>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(parseNumericInput(e.target.value))}
              className={inputClass}
            />
          </label>
        </div>

        <SectionHeading>Specifications</SectionHeading>
        <label>
          <span className={labelClass}>Spec section title (optional)</span>
          <input
            type="text"
            value={specSectionTitle}
            onChange={(e) => setSpecSectionTitle(e.target.value)}
            className={inputClass}
          />
        </label>
        <label>
          <span className={labelClass}>Spec description (optional)</span>
          <textarea
            value={specDescription}
            onChange={(e) => setSpecDescription(e.target.value)}
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </label>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={labelClass}>Spec rows</span>
            <button type="button" onClick={addSpec} className="text-xs text-primary-600 hover:underline">
              + Add spec
            </button>
          </div>
          {specs.map((spec, i) => (
            <div key={i} className="flex gap-2 items-center mb-1">
              <input
                placeholder="Label"
                value={spec.label}
                onChange={(e) => updateSpec(i, 'label', e.target.value)}
                className={`${inputClass} flex-1 text-sm`}
              />
              <input
                placeholder="Value"
                value={spec.value}
                onChange={(e) => updateSpec(i, 'value', e.target.value)}
                className={`${inputClass} flex-1 text-sm`}
              />
              <button type="button" onClick={() => removeSpec(i)} className={deleteBtnClass}>
                Remove
              </button>
            </div>
          ))}
        </div>

        <SectionHeading>Certifications</SectionHeading>
        <label>
          <span className={labelClass}>Certifications heading (optional)</span>
          <input
            type="text"
            value={certificationsSectionTitle}
            onChange={(e) => setCertificationsSectionTitle(e.target.value)}
            className={inputClass}
          />
        </label>
        <label>
          <span className={labelClass}>Certifications intro (optional)</span>
          <textarea
            value={certificationsSectionDescription}
            onChange={(e) => setCertificationsSectionDescription(e.target.value)}
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </label>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={labelClass}>Certification logos</span>
            <button type="button" onClick={addCertification} className="text-xs text-primary-600 hover:underline">
              + Add certification
            </button>
          </div>
          {certificationItems.map((c, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 items-start">
              <input
                placeholder="Name"
                value={c.name}
                onChange={(e) => updateCertification(i, 'name', e.target.value)}
                className={`${inputClass} text-sm md:col-span-2`}
              />
              <div className="flex gap-1 items-center md:col-span-2">
                {c.image && (
                  <img src={c.image} alt="" className="h-10 w-10 rounded object-cover border border-gray-300 shrink-0" />
                )}
                <button
                  type="button"
                  onClick={() => openInlineImagePicker({ kind: 'certification', index: i })}
                  disabled={uploadingSlot !== null}
                  className={inlineUploadBtnClass}
                >
                  {slotUploading(uploadingSlot, { kind: 'certification', index: i }) ? '…' : 'Upload'}
                </button>
                <input
                  type="text"
                  placeholder="Image URL"
                  value={c.image}
                  onChange={(e) => updateCertification(i, 'image', e.target.value)}
                  className={`${inputClass} text-sm flex-1 min-w-0`}
                />
              </div>
              <textarea
                placeholder="Description (optional)"
                value={c.description ?? ''}
                onChange={(e) => updateCertification(i, 'description', e.target.value)}
                rows={2}
                className={`${inputClass} text-sm md:col-span-3 resize-y`}
              />
              <button
                type="button"
                onClick={() => removeCertification(i)}
                className={`${deleteBtnClass} md:col-span-1 mt-1`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <SectionHeading>Substrates</SectionHeading>
        <label>
          <span className={labelClass}>Substrates title</span>
          <input
            type="text"
            value={substratesTitle}
            onChange={(e) => setSubstratesTitle(e.target.value)}
            className={inputClass}
          />
        </label>
        <label>
          <span className={labelClass}>Substrates description</span>
          <textarea
            value={substratesDescription}
            onChange={(e) => setSubstratesDescription(e.target.value)}
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </label>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={labelClass}>Substrate items</span>
            <button type="button" onClick={addSubstrate} className="text-xs text-primary-600 hover:underline">
              + Add substrate
            </button>
          </div>
          {substrateItems.map((item, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
              <input
                placeholder="Name"
                value={item.name}
                onChange={(e) => updateSubstrate(i, 'name', e.target.value)}
                className={`${inputClass} text-sm md:col-span-2`}
              />
              <input
                placeholder="Thickness"
                value={item.thickness ?? ''}
                onChange={(e) => updateSubstrate(i, 'thickness', e.target.value)}
                className={`${inputClass} text-sm`}
              />
              <div className="flex gap-1 items-center flex-wrap min-w-0">
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    className="h-10 w-10 rounded object-cover border border-gray-300 shrink-0"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => openInlineImagePicker({ kind: 'substrate', index: i })}
                  disabled={uploadingSlot !== null}
                  className={inlineUploadBtnClass}
                >
                  {slotUploading(uploadingSlot, { kind: 'substrate', index: i }) ? '…' : 'Upload'}
                </button>
                <input
                  placeholder="Image URL"
                  value={item.image ?? ''}
                  onChange={(e) => updateSubstrate(i, 'image', e.target.value)}
                  className={`${inputClass} text-sm flex-1 min-w-0`}
                />
              </div>
              <textarea
                placeholder="Description (optional)"
                value={item.description ?? ''}
                onChange={(e) => updateSubstrate(i, 'description', e.target.value)}
                rows={2}
                className={`${inputClass} text-sm md:col-span-3 resize-y`}
              />
              <button
                type="button"
                onClick={() => removeSubstrate(i)}
                className={`${deleteBtnClass} md:col-span-1 mt-1`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <SectionHeading>About the product tabs</SectionHeading>
        {aboutTabDefs.map((def) => (
          <label key={def.key} className="block mb-2">
            <span className={labelClass}>{def.title}</span>
            <textarea
              value={aboutTabText[def.key] ?? ''}
              onChange={(e) =>
                setAboutTabText((prev) => ({
                  ...prev,
                  [def.key]: e.target.value,
                }))
              }
              rows={3}
              className={`${inputClass} resize-y`}
              placeholder="One item per line"
            />
          </label>
        ))}

        <SectionHeading>Finishes &amp; shades</SectionHeading>
        <label>
          <span className={labelClass}>Finishes title</span>
          <input
            type="text"
            value={finishesTitle}
            onChange={(e) => setFinishesTitle(e.target.value)}
            className={inputClass}
          />
        </label>
        <label>
          <span className={labelClass}>Finishes description</span>
          <textarea
            value={finishesDescription}
            onChange={(e) => setFinishesDescription(e.target.value)}
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </label>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={labelClass}>Finish items</span>
            <button type="button" onClick={addFinish} className="text-xs text-primary-600 hover:underline">
              + Add finish
            </button>
          </div>
          {finishItems.map((item, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <input
                placeholder="Name"
                value={item.name}
                onChange={(e) => updateFinish(i, 'name', e.target.value)}
                className={`${inputClass} text-sm`}
              />
              <div className="flex gap-1 items-center flex-wrap min-w-0 md:col-span-1">
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    className="h-10 w-10 rounded object-cover border border-gray-300 shrink-0"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => openInlineImagePicker({ kind: 'finish', index: i })}
                  disabled={uploadingSlot !== null}
                  className={inlineUploadBtnClass}
                >
                  {slotUploading(uploadingSlot, { kind: 'finish', index: i }) ? '…' : 'Upload'}
                </button>
                <input
                  placeholder="Image URL"
                  value={item.image}
                  onChange={(e) => updateFinish(i, 'image', e.target.value)}
                  className={`${inputClass} text-sm flex-1 min-w-0`}
                />
              </div>
              <textarea
                placeholder="Description (optional)"
                value={item.description ?? ''}
                onChange={(e) => updateFinish(i, 'description', e.target.value)}
                rows={2}
                className={`${inputClass} text-sm md:col-span-2 resize-y`}
              />
              <button
                type="button"
                onClick={() => removeFinish(i)}
                className={`${deleteBtnClass} md:col-span-1 mt-1`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <SectionHeading>3D Visualizer</SectionHeading>
        <p className="m-0 mb-2 text-xs text-gray-500 leading-relaxed">
          Add finishes/shades with a thumbnail and GLB model. Each item can include multiple profiles (PNG/JPG
          image + name). The storefront loads the item GLB and lets visitors pick a profile.
        </p>
        <label>
          <span className={labelClass}>Section title (public)</span>
          <input
            type="text"
            value={visTitle}
            onChange={(e) => setVisTitle(e.target.value)}
            placeholder="Product Profiles"
            className={inputClass}
          />
        </label>
        <label>
          <span className={labelClass}>Section description (public)</span>
          <textarea
            value={visDesc}
            onChange={(e) => setVisDesc(e.target.value)}
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </label>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={labelClass}>3D items</span>
            <button type="button" onClick={addVisItem} className="text-xs text-primary-600 hover:underline">
              + Add item
            </button>
          </div>
          {visItems.map((item, i) => (
            <div
              key={i}
              className="mb-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateVisItem(i, 'name', e.target.value)}
                  className={`${inputClass} text-sm`}
                />
                <div className="flex gap-1 items-center flex-wrap min-w-0 md:col-span-1">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="h-10 w-10 rounded object-cover border border-gray-300 shrink-0"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openInlineImagePicker({ kind: 'visualizerThumb', index: i })}
                    disabled={uploadingSlot !== null}
                    className={inlineUploadBtnClass}
                  >
                    {slotUploading(uploadingSlot, { kind: 'visualizerThumb', index: i }) ? '…' : 'Thumb'}
                  </button>
                  <input
                    placeholder="Thumbnail URL"
                    value={item.thumbnail}
                    onChange={(e) => updateVisItem(i, 'thumbnail', e.target.value)}
                    className={`${inputClass} text-sm flex-1 min-w-0`}
                  />
                </div>
                <div className="flex gap-1 items-center flex-wrap min-w-0 md:col-span-2">
                  <button
                    type="button"
                    onClick={() => openGlbPicker(i)}
                    disabled={uploadingGlbIndex !== null}
                    className={inlineUploadBtnClass}
                  >
                    {uploadingGlbIndex === i ? '…' : 'Upload GLB'}
                  </button>
                  <input
                    placeholder="GLB model URL"
                    value={item.glb}
                    onChange={(e) => updateVisItem(i, 'glb', e.target.value)}
                    className={`${inputClass} text-sm flex-1 min-w-0`}
                  />
                  {item.glb ? (
                    <span className="text-xs text-green-700 shrink-0">GLB attached</span>
                  ) : null}
                </div>
                <textarea
                  placeholder="Description (optional)"
                  value={item.description}
                  onChange={(e) => updateVisItem(i, 'description', e.target.value)}
                  rows={2}
                  className={`${inputClass} text-sm md:col-span-2 resize-y`}
                />
                <button
                  type="button"
                  onClick={() => removeVisItem(i)}
                  className={`${deleteBtnClass} md:col-span-1 mt-1`}
                >
                  Remove item
                </button>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-gray-600">Profiles (PNG/JPG + name)</span>
                  <button
                    type="button"
                    onClick={() => addVisProfile(i)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    + Add profile
                  </button>
                </div>
                {(item.profiles ?? []).length === 0 ? (
                  <p className="m-0 text-xs text-gray-500">No profiles yet.</p>
                ) : null}
                {(item.profiles ?? []).map((profile, pi) => (
                  <div
                    key={pi}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 items-start border-t border-gray-200 pt-2 first:border-t-0 first:pt-0"
                  >
                    <input
                      placeholder="Profile name"
                      value={profile.name}
                      onChange={(e) => updateVisProfile(i, pi, 'name', e.target.value)}
                      className={`${inputClass} text-sm md:col-span-4`}
                    />
                    <div className="flex gap-1 items-center flex-wrap min-w-0 md:col-span-7">
                      {profile.image ? (
                        <img
                          src={profile.image}
                          alt=""
                          className="h-10 w-10 rounded object-cover border border-gray-300 shrink-0"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          openInlineImagePicker({
                            kind: 'visualizerProfileImage',
                            itemIndex: i,
                            profileIndex: pi,
                          })
                        }
                        disabled={uploadingSlot !== null}
                        className={inlineUploadBtnClass}
                      >
                        {slotUploading(uploadingSlot, {
                          kind: 'visualizerProfileImage',
                          itemIndex: i,
                          profileIndex: pi,
                        })
                          ? '…'
                          : 'Upload'}
                      </button>
                      <input
                        placeholder="Image URL"
                        value={profile.image}
                        onChange={(e) => updateVisProfile(i, pi, 'image', e.target.value)}
                        className={`${inputClass} text-sm flex-1 min-w-0`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVisProfile(i, pi)}
                      className={`${deleteBtnClass} md:col-span-1 justify-self-end`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <SectionHeading>Gallery</SectionHeading>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={labelClass}>Gallery images</span>
            <button type="button" onClick={addGalleryImage} className="text-xs text-primary-600 hover:underline">
              + Add image
            </button>
          </div>
          {galleryImages.map((img, i) => (
            <div key={i} className="flex gap-2 items-center mb-1 flex-wrap">
              {img.url ? (
                <img
                  src={img.url}
                  alt=""
                  className="h-10 w-10 rounded object-cover border border-gray-300 shrink-0"
                />
              ) : null}
              <button
                type="button"
                onClick={() => openInlineImagePicker({ kind: 'gallery', index: i })}
                disabled={uploadingSlot !== null}
                className={inlineUploadBtnClass}
              >
                {slotUploading(uploadingSlot, { kind: 'gallery', index: i }) ? '…' : 'Upload'}
              </button>
              <input
                placeholder="Image URL"
                value={img.url}
                onChange={(e) => updateGalleryImage(i, 'url', e.target.value)}
                className={`${inputClass} flex-1 text-sm min-w-[120px]`}
              />
              <input
                placeholder="Alt (optional)"
                value={img.alt ?? ''}
                onChange={(e) => updateGalleryImage(i, 'alt', e.target.value)}
                className={`${inputClass} w-48 text-sm`}
              />
              <button type="button" onClick={() => removeGalleryImage(i)} className={deleteBtnClass}>
                Remove
              </button>
            </div>
          ))}
        </div>

        <SectionHeading>SEO (optional)</SectionHeading>
        <label>
          <span className={labelClass}>Meta title</span>
          <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputClass} />
        </label>
        <label>
          <span className={labelClass}>Meta description</span>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </label>

        <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving || !!saveBlockedReason}
              className="py-2 px-4 text-sm font-medium text-white bg-primary-600 border-0 rounded-lg cursor-pointer hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={onCancel} className={cancelBtnClass}>
              Cancel
            </button>
          </div>
          {saveBlockedReason ? (
            <p className="m-0 text-sm text-amber-700">{saveBlockedReason} before saving.</p>
          ) : null}
          {error && <p className="m-0 text-sm text-red-600">{error}</p>}
        </div>
      </form>
    </section>
  );
}

export default function Products() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useProductsList();
  const { data: categoriesData } = useCategoriesList();
  const [editing, setEditing] = useState<ProductItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
  };

  async function handleCreate(body: CreateProductBody) {
    setSaving(true);
    setSaveError(null);
    try {
      await createProduct(body);
      setAdding(false);
      invalidate();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(body: CreateProductBody) {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateProduct(editing._id, body);
      setEditing(null);
      invalidate();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      invalidate();
      if (editing?._id === id) setEditing(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  return (
    <PageShell
      title="Products"
      action={
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="py-2 px-4 text-sm font-medium text-white bg-primary-600 border-0 rounded-lg cursor-pointer hover:bg-primary-700"
        >
          Add product
        </button>
      }
    >
      <Modal
        open={adding}
        onClose={() => {
          setAdding(false);
          setSaveError(null);
        }}
        title="Add product"
        maxWidth="max-w-4xl"
        closeOnBackdropClick={false}
        closeOnEscape={false}
      >
        <ProductForm
          key="new-product"
          product={null}
          categories={categoriesData?.items ?? []}
          onSave={handleCreate}
          onCancel={() => {
            setAdding(false);
            setSaveError(null);
          }}
          isSaving={saving}
          error={saveError}
          hideTitle
        />
      </Modal>
      <Modal
        open={!!editing}
        onClose={() => {
          setEditing(null);
          setSaveError(null);
        }}
        title={editing ? `Edit: ${editing.title}` : ''}
        maxWidth="max-w-4xl"
        closeOnBackdropClick={false}
        closeOnEscape={false}
      >
        {editing && (
          <ProductForm
            key={editing._id}
            product={editing}
            categories={categoriesData?.items ?? []}
            onSave={handleUpdate}
            onCancel={() => {
              setEditing(null);
              setSaveError(null);
            }}
            isSaving={saving}
            error={saveError}
            hideTitle
          />
        )}
      </Modal>

      <section className="mb-8">
        <h2 className="m-0 mb-4 text-base font-semibold text-gray-500 uppercase tracking-wider">
          All products
        </h2>
        {isLoading && <InlineLoader />}
        {isError && (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load products'}
          />
        )}
        {data && (
          <div className="overflow-x-auto rounded-xl border border-gray-300">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-2 px-3">Image</th>
                  <th className="py-2 px-3">Slug</th>
                  <th className="py-2 px-3">Title</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Order</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-gray-200 hover:bg-blue-50/60 transition-colors"
                  >
                    <td className="py-2 px-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-10 w-auto max-w-[80px] rounded object-cover"
                        />
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-sm">{item.slug}</td>
                    <td className="py-2 px-3">{item.title}</td>
                    <td className="py-2 px-3 text-gray-500">{item.categorySlug ?? '—'}</td>
                    <td className="py-2 px-3">{item.order}</td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        className="py-1 px-2 text-sm text-primary-400 hover:underline mr-2 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item._id)}
                        className="py-1 px-2 text-sm text-red-600 hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.items.length === 0 && !adding && (
          <EmptyState message="No products yet. Run backend seed or migrate, then Add product." />
        )}
      </section>
    </PageShell>
  );
}

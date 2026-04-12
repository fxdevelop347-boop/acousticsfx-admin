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
  type VisualizerTexture,
  type VisualizerDimensions,
} from '../api/products';
import { useQueryClient } from '@tanstack/react-query';
import type { CategoryItem } from '../api/categories';
import Modal from '../components/Modal';
import { ImageUploadField } from '../components/ImageUploadField';
import { inputClass, labelClass, cancelBtnClass, deleteBtnClass } from '../lib/styles';
import PageShell from '../components/PageShell';
import { EmptyState, ErrorState, InlineLoader } from '../components/EmptyState';
import { slugify } from '../lib/slugify';
import { uploadImage } from '../api/upload';

type InlineImageSlot =
  | { kind: 'certification'; index: number }
  | { kind: 'substrate'; index: number }
  | { kind: 'finish'; index: number }
  | { kind: 'gallery'; index: number }
  | { kind: 'visualizer'; index: number };

const inlineUploadBtnClass =
  'py-1 px-2 text-xs font-medium text-primary-600 border border-primary-400 rounded-lg hover:bg-primary-50 disabled:opacity-50 shrink-0 cursor-pointer';

function slotUploading(
  active: InlineImageSlot | null,
  kind: InlineImageSlot['kind'],
  index: number
): boolean {
  return active !== null && active.kind === kind && active.index === index;
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
  const [categorySlug, setCategorySlug] = useState(initial?.categorySlug ?? '');
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? '');

  const [specSectionTitle, setSpecSectionTitle] = useState(initial?.specSectionTitle ?? '');
  const [specDescription, setSpecDescription] = useState(initial?.specDescription ?? '');
  const [specs, setSpecs] = useState<SubProductSpec[]>(initial?.specs ?? []);
  const [certificationsSectionTitle, setCertificationsSectionTitle] = useState(
    initial?.certificationsSectionTitle ?? ''
  );
  const [certificationsSectionDescription, setCertificationsSectionDescription] = useState(
    initial?.certificationsSectionDescription ?? ''
  );
  const [certificationItems, setCertificationItems] = useState<SubProductCertification[]>(
    initial?.certifications ?? []
  );
  const [galleryImages, setGalleryImages] = useState<SubProductGalleryImage[]>(
    initial?.galleryImages ??
      (initial?.gallerySlides?.length
        ? initial.gallerySlides.flatMap((s) => [{ url: s.large }, { url: s.small }]).filter((x) => !!x.url)
        : [])
  );

  const inlineFileRef = useRef<HTMLInputElement>(null);
  const pendingInlineSlotRef = useRef<InlineImageSlot | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<InlineImageSlot | null>(null);

  type SubstrateItem = NonNullable<SubProductSubstratesSection['items']>[number];
  const [substratesTitle, setSubstratesTitle] = useState(initial?.substratesSection?.title ?? '');
  const [substratesDescription, setSubstratesDescription] = useState(
    initial?.substratesSection?.description ?? ''
  );
  const [substrateItems, setSubstrateItems] = useState<SubstrateItem[]>(
    initial?.substratesSection?.items ?? []
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
  const [finishItems, setFinishItems] = useState<FinishItem[]>(initial?.finishesSection?.items ?? []);

  const [visWidth, setVisWidth] = useState<VisualizerDimensions['width']>(initial?.visualizerDimensions?.width ?? 120);
  const [visHeight, setVisHeight] = useState<VisualizerDimensions['height']>(initial?.visualizerDimensions?.height ?? 60);
  const [visDepth, setVisDepth] = useState<VisualizerDimensions['depth']>(initial?.visualizerDimensions?.depth ?? 4);
  const [visTextures, setVisTextures] = useState<VisualizerTexture[]>(initial?.visualizerTextures ?? []);

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
        case 'visualizer':
          setVisTextures((prev) => {
            const next = [...prev];
            if (next[slot.index]) {
              const currentName = next[slot.index].name?.trim();
              next[slot.index] = { 
                ...next[slot.index], 
                image: url,
                name: currentName || `Material ${slot.index + 1}`
              };
            }
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

  const addVisTexture = () => setVisTextures((prev) => [...prev, { name: '', image: '' }]);
  const updateVisTexture = (i: number, field: keyof VisualizerTexture, value: string) => {
    setVisTextures((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };
  const removeVisTexture = (i: number) => setVisTextures((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedSlug = (slug.trim() || slugify(title.trim())).trim();
    if (!resolvedSlug) {
      alert('Title or URL slug is required.');
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
        name: s.name.trim(),
        thickness: s.thickness?.trim() || undefined,
        description: s.description?.trim() || undefined,
        image: s.image?.trim() || undefined,
      }))
      .filter((s) => s.name);

    const finishesClean = finishItems
      .map((f) => ({
        name: f.name.trim(),
        description: f.description?.trim() || undefined,
        image: f.image.trim(),
      }))
      .filter((f) => f.name && f.image);

    const certificationsClean = certificationItems
      .map((c) => ({
        name: c.name.trim(),
        image: c.image.trim(),
        description: c.description?.trim() || undefined,
      }))
      .filter((c) => c.name && c.image);

    const body: CreateProductBody = {
      slug: resolvedSlug,
      title: title.trim(),
      description: description.trim(),
      image: image.trim(),
      heroImage: heroImage.trim() || undefined,
      categorySlug: categorySlug.trim() || undefined,
      order,
      shortDescription: shortDescription.trim() || undefined,
      metaTitle: metaTitle.trim() || undefined,
      metaDescription: metaDescription.trim() || undefined,
      showTrademark,
      specSectionTitle: specSectionTitle.trim(),
      certificationsSectionTitle: certificationsSectionTitle.trim(),
      certificationsSectionDescription: certificationsSectionDescription.trim(),
      ...(specDescription.trim() && { specDescription: specDescription.trim() }),
      ...(specs.filter((s) => s.label.trim() || s.value.trim()).length > 0 && {
        specs: specs
          .filter((s) => s.label.trim() || s.value.trim())
          .map((s) => ({ label: s.label.trim() || '—', value: s.value.trim() || '—' })),
      }),
      galleryImages: galleryImages.filter((g) => g.url.trim()).map((g) => ({
        url: g.url.trim(),
        alt: g.alt?.trim() || undefined,
      })),
      ...(aboutTabs.length > 0 && { aboutTabs }),
      ...((substratesTitle.trim() ||
        substratesDescription.trim() ||
        substratesClean.length > 0) && {
        substratesSection: {
          title: substratesTitle.trim() || undefined,
          description: substratesDescription.trim() || undefined,
          items: substratesClean,
        },
      }),
      ...((finishesTitle.trim() ||
        finishesDescription.trim() ||
        finishesClean.length > 0) && {
        finishesSection: {
          title: finishesTitle.trim() || undefined,
          description: finishesDescription.trim() || undefined,
          items: finishesClean,
        },
      }),
      certifications: certificationsClean,
      visualizerDimensions: {
        width: visWidth,
        height: visHeight,
        depth: visDepth,
      },
      visualizerTextures: visTextures
        .map((vt) => ({ name: vt.name.trim(), image: vt.image.trim() }))
        .filter((vt) => vt.name && vt.image),
    };

    if (profilesSectionRef.current) {
      body.profilesSection = profilesSectionRef.current;
    }

    onSave(body);
  };

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
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-h-[85vh] overflow-y-auto pr-1">
        <input
          ref={inlineFileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          className="hidden"
          onChange={handleInlineImageFile}
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
              onChange={(e) => setOrder(Number(e.target.value) || 0)}
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
                  {slotUploading(uploadingSlot, 'certification', i) ? '…' : 'Upload'}
                </button>
                <input
                  type="url"
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
                  {slotUploading(uploadingSlot, 'substrate', i) ? '…' : 'Upload'}
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
                  {slotUploading(uploadingSlot, 'finish', i) ? '…' : 'Upload'}
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
          Textures are shown on the product page 3D preview. Use Upload (ImageKit) or paste an HTTPS image URL.
          The public site loads textures through your API proxy so WebGL can render them (CORS). Default allowed
          host is ImageKit (<span className="font-mono">ik.imagekit.io</span>); for other CDNs set{' '}
          <span className="font-mono">TEXTURE_PROXY_ALLOWED_HOSTS</span> on the API server (comma-separated hosts).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label>
            <span className={labelClass}>Default Width (cm)</span>
            <input
              type="number"
              value={visWidth}
              onChange={(e) => setVisWidth(Number(e.target.value) || 0)}
              className={inputClass}
            />
          </label>
          <label>
            <span className={labelClass}>Default Height (cm)</span>
            <input
              type="number"
              value={visHeight}
              onChange={(e) => setVisHeight(Number(e.target.value) || 0)}
              className={inputClass}
            />
          </label>
          <label>
            <span className={labelClass}>Default Depth (cm)</span>
            <input
              type="number"
              value={visDepth}
              onChange={(e) => setVisDepth(Number(e.target.value) || 0)}
              className={inputClass}
            />
          </label>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1 mt-2">
            <span className={labelClass}>Textures / Swatches</span>
            <button type="button" onClick={addVisTexture} className="text-xs text-primary-600 hover:underline">
              + Add texture
            </button>
          </div>
          {visTextures.map((vt, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2 items-start">
              <input
                placeholder="Name (e.g. Oak)"
                value={vt.name}
                onChange={(e) => updateVisTexture(i, 'name', e.target.value)}
                className={`${inputClass} text-sm`}
              />
              <div className="flex gap-1 items-center flex-wrap min-w-0">
                {vt.image ? (
                  <img src={vt.image} alt="" className="h-10 w-10 rounded object-cover border border-gray-300 shrink-0" />
                ) : null}
                <button
                  type="button"
                  onClick={() => openInlineImagePicker({ kind: 'visualizer', index: i })}
                  disabled={uploadingSlot !== null}
                  className={inlineUploadBtnClass}
                >
                  {slotUploading(uploadingSlot, 'visualizer', i) ? '…' : 'Upload'}
                </button>
                <input
                  placeholder="Image URL"
                  value={vt.image}
                  onChange={(e) => updateVisTexture(i, 'image', e.target.value)}
                  className={`${inputClass} text-sm flex-1 min-w-0`}
                />
              </div>
              <button
                type="button"
                onClick={() => removeVisTexture(i)}
                className={`${deleteBtnClass} mt-1`}
              >
                Remove
              </button>
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
                {slotUploading(uploadingSlot, 'gallery', i) ? '…' : 'Upload'}
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

        <div className="flex gap-2 pt-3 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSaving || !title.trim() || !image.trim()}
            className="py-2 px-4 text-sm font-medium text-white bg-primary-600 border-0 rounded-lg cursor-pointer hover:bg-primary-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={onCancel} className={cancelBtnClass}>
            Cancel
          </button>
        </div>
        {error && <p className="m-0 text-sm text-red-600">{error}</p>}
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
        maxWidth="max-w-2xl"
      >
        <ProductForm
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
        maxWidth="max-w-2xl"
      >
        {editing && (
          <ProductForm
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

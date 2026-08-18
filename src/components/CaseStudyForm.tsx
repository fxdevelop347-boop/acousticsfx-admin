import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { inputClass, labelClass, cancelBtnClass, primaryBtnClass } from '../lib/styles';
import { slugify } from '../lib/slugify';
import { ImageUploadField } from './ImageUploadField';
import type {
  CaseStudyGalleryImage,
  CaseStudyItem,
  CaseStudyMetric,
  CaseStudyPayload,
} from '../api/caseStudies';

const MAX_METRICS = 4;
const MAX_GALLERY_IMAGES = 8;

const TABS = ['Overview', 'Story', 'Metrics & media', 'SEO & status'] as const;
type Tab = (typeof TABS)[number];

/**
 * Editing shape. `productsUsed` is a comma-separated string here because that is
 * far quicker to edit than a row-per-tag repeater for what is usually 2-5 tags.
 */
interface FormState {
  slug: string;
  title: string;
  description: string;
  image: string;
  order: number;
  client: string;
  industry: string;
  location: string;
  year: string;
  challenge: string;
  solution: string;
  results: string;
  metrics: CaseStudyMetric[];
  gallery: CaseStudyGalleryImage[];
  productsUsed: string;
  quoteText: string;
  quoteAuthor: string;
  quoteRole: string;
  isPublished: boolean;
  isFeatured: boolean;
  metaDescription: string;
}

function emptyForm(): FormState {
  return {
    slug: '',
    title: '',
    description: '',
    image: '',
    order: 0,
    client: '',
    industry: '',
    location: '',
    year: '',
    challenge: '',
    solution: '',
    results: '',
    metrics: [],
    gallery: [],
    productsUsed: '',
    quoteText: '',
    quoteAuthor: '',
    quoteRole: '',
    isPublished: true,
    isFeatured: false,
    metaDescription: '',
  };
}

function toForm(item: CaseStudyItem): FormState {
  return {
    slug: item.slug,
    title: item.title,
    description: item.description ?? '',
    image: item.image ?? '',
    order: item.order ?? 0,
    client: item.client ?? '',
    industry: item.industry ?? '',
    location: item.location ?? '',
    year: item.year ?? '',
    challenge: item.challenge ?? '',
    solution: item.solution ?? '',
    results: item.results ?? '',
    metrics: item.metrics ?? [],
    gallery: item.gallery ?? [],
    productsUsed: (item.productsUsed ?? []).join(', '),
    quoteText: item.quote?.text ?? '',
    quoteAuthor: item.quote?.author ?? '',
    quoteRole: item.quote?.role ?? '',
    // Records predating the field are live.
    isPublished: item.isPublished !== false,
    isFeatured: item.isFeatured === true,
    metaDescription: item.metaDescription ?? '',
  };
}

function toPayload(form: FormState, isEditing: boolean): CaseStudyPayload {
  const trimmed = (s: string) => s.trim();
  const quoteText = trimmed(form.quoteText);
  return {
    slug: isEditing ? trimmed(form.slug) : slugify(trimmed(form.title)),
    title: trimmed(form.title),
    description: trimmed(form.description),
    image: trimmed(form.image),
    order: form.order,
    client: trimmed(form.client),
    industry: trimmed(form.industry),
    location: trimmed(form.location),
    year: trimmed(form.year),
    challenge: trimmed(form.challenge),
    solution: trimmed(form.solution),
    results: trimmed(form.results),
    metrics: form.metrics.filter((m) => m.value.trim() && m.label.trim()),
    gallery: form.gallery.filter((g) => g.url.trim()),
    productsUsed: form.productsUsed
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean),
    quote: quoteText
      ? { text: quoteText, author: trimmed(form.quoteAuthor), role: trimmed(form.quoteRole) }
      : undefined,
    isPublished: form.isPublished,
    isFeatured: form.isFeatured,
    metaDescription: trimmed(form.metaDescription),
  };
}

interface CaseStudyFormProps {
  /** The record being edited, or null when adding. */
  editing: CaseStudyItem | null;
  saving: boolean;
  saveError: string | null;
  onSubmit: (payload: CaseStudyPayload) => void;
  onCancel: () => void;
}

export default function CaseStudyForm({
  editing,
  saving,
  saveError,
  onSubmit,
  onCancel,
}: CaseStudyFormProps) {
  const [tab, setTab] = useState<Tab>('Overview');
  const [form, setForm] = useState<FormState>(() =>
    editing ? toForm(editing) : emptyForm()
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(toPayload(form, !!editing));
  };

  const updateMetric = (index: number, patch: Partial<CaseStudyMetric>) =>
    setForm((f) => ({
      ...f,
      metrics: f.metrics.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));

  const updateGalleryImage = (index: number, patch: Partial<CaseStudyGalleryImage>) =>
    setForm((f) => ({
      ...f,
      gallery: f.gallery.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    }));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Tabs keep ~20 fields navigable instead of one long scroll. */}
      <div className="flex gap-1 border-b border-gray-200 -mx-1 px-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-0 bg-transparent cursor-pointer border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'text-primary-600 border-primary-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="flex flex-col gap-3">
          <label>
            <span className={labelClass}>Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              required
              className={inputClass}
              placeholder="Corporate HQ acoustic retrofit"
            />
          </label>

          {editing && (
            <label>
              <span className={labelClass}>Slug</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-gray-500 mt-1">
                Changing this breaks existing links to this case study.
              </p>
            </label>
          )}

          <label>
            <span className={labelClass}>Summary</span>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className={`${inputClass} resize-y`}
              placeholder="One or two sentences shown on listing cards and the home page carousel."
            />
          </label>

          <ImageUploadField
            label="Hero image"
            hint="Used on cards, the page hero, and social shares."
            value={form.image}
            onChange={(url) => set('image', url)}
          />

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className={labelClass}>Client</span>
              <input
                type="text"
                value={form.client}
                onChange={(e) => set('client', e.target.value)}
                className={inputClass}
                placeholder="Godrej Properties"
              />
            </label>
            <label>
              <span className={labelClass}>Industry</span>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => set('industry', e.target.value)}
                className={inputClass}
                placeholder="Corporate Office"
              />
            </label>
            <label>
              <span className={labelClass}>Location</span>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                className={inputClass}
                placeholder="Mumbai, India"
              />
            </label>
            <label>
              <span className={labelClass}>Year</span>
              <input
                type="text"
                value={form.year}
                onChange={(e) => set('year', e.target.value)}
                className={inputClass}
                placeholder="2024"
              />
            </label>
          </div>

          <label>
            <span className={labelClass}>Order</span>
            <input
              type="number"
              value={form.order}
              onChange={(e) => set('order', Number(e.target.value) || 0)}
              className={inputClass}
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower numbers appear first. Featured case studies always sort above the rest.
            </p>
          </label>
        </div>
      )}

      {tab === 'Story' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500 m-0">
            Each section becomes its own block on the case study page. Leave any of them
            blank and that block is hidden.
          </p>
          <label>
            <span className={labelClass}>The challenge</span>
            <textarea
              value={form.challenge}
              onChange={(e) => set('challenge', e.target.value)}
              rows={5}
              className={`${inputClass} resize-y`}
              placeholder="What acoustic problem was the client facing?"
            />
          </label>
          <label>
            <span className={labelClass}>Our solution</span>
            <textarea
              value={form.solution}
              onChange={(e) => set('solution', e.target.value)}
              rows={5}
              className={`${inputClass} resize-y`}
              placeholder="What did FX Acoustics design, supply, and install?"
            />
          </label>
          <label>
            <span className={labelClass}>The results</span>
            <textarea
              value={form.results}
              onChange={(e) => set('results', e.target.value)}
              rows={5}
              className={`${inputClass} resize-y`}
              placeholder="What measurably changed for the client?"
            />
          </label>
        </div>
      )}

      {tab === 'Metrics & media' && (
        <div className="flex flex-col gap-5">
          <section>
            <div className="flex items-center justify-between mb-1">
              <span className={`${labelClass} mb-0`}>Headline metrics</span>
              <button
                type="button"
                onClick={() =>
                  set('metrics', [...form.metrics, { value: '', label: '' }])
                }
                disabled={form.metrics.length >= MAX_METRICS}
                className="inline-flex items-center gap-1 py-1 px-2 text-sm text-primary-600 bg-transparent border-0 cursor-pointer hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} /> Add metric
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Up to {MAX_METRICS}. Shown as large numbers near the top of the page — the
              first one also appears on the listing card.
            </p>
            {form.metrics.length === 0 ? (
              <p className="text-sm text-gray-400 m-0">No metrics added.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {form.metrics.map((metric, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={metric.value}
                      onChange={(e) => updateMetric(i, { value: e.target.value })}
                      className={`${inputClass} w-28 flex-shrink-0`}
                      placeholder="60%"
                      aria-label={`Metric ${i + 1} value`}
                    />
                    <input
                      type="text"
                      value={metric.label}
                      onChange={(e) => updateMetric(i, { label: e.target.value })}
                      className={inputClass}
                      placeholder="Reverberation reduction"
                      aria-label={`Metric ${i + 1} label`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set('metrics', form.metrics.filter((_, idx) => idx !== i))
                      }
                      className="p-2 text-gray-400 bg-transparent border-0 cursor-pointer hover:text-red-600"
                      aria-label={`Remove metric ${i + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-1">
              <span className={`${labelClass} mb-0`}>Project gallery</span>
              <button
                type="button"
                onClick={() => set('gallery', [...form.gallery, { url: '', caption: '' }])}
                disabled={form.gallery.length >= MAX_GALLERY_IMAGES}
                className="inline-flex items-center gap-1 py-1 px-2 text-sm text-primary-600 bg-transparent border-0 cursor-pointer hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} /> Add image
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Up to {MAX_GALLERY_IMAGES} additional project photos.
            </p>
            {form.gallery.length === 0 ? (
              <p className="text-sm text-gray-400 m-0">No gallery images added.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {form.gallery.map((img, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-200 p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        Image {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          set('gallery', form.gallery.filter((_, idx) => idx !== i))
                        }
                        className="p-1 text-gray-400 bg-transparent border-0 cursor-pointer hover:text-red-600"
                        aria-label={`Remove gallery image ${i + 1}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <ImageUploadField
                      label=""
                      value={img.url}
                      onChange={(url) => updateGalleryImage(i, { url })}
                    />
                    <input
                      type="text"
                      value={img.caption ?? ''}
                      onChange={(e) => updateGalleryImage(i, { caption: e.target.value })}
                      className={inputClass}
                      placeholder="Caption (optional)"
                      aria-label={`Gallery image ${i + 1} caption`}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <label>
            <span className={labelClass}>Products used</span>
            <input
              type="text"
              value={form.productsUsed}
              onChange={(e) => set('productsUsed', e.target.value)}
              className={inputClass}
              placeholder="Wood acoustic panels, Ceiling baffles"
            />
            <p className="text-xs text-gray-500 mt-1">Separate with commas.</p>
          </label>

          <section className="flex flex-col gap-2">
            <span className={`${labelClass} mb-0`}>Client quote</span>
            <textarea
              value={form.quoteText}
              onChange={(e) => set('quoteText', e.target.value)}
              rows={3}
              className={`${inputClass} resize-y`}
              placeholder="What the client said about the outcome."
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={form.quoteAuthor}
                onChange={(e) => set('quoteAuthor', e.target.value)}
                className={inputClass}
                placeholder="Name"
                aria-label="Quote author"
              />
              <input
                type="text"
                value={form.quoteRole}
                onChange={(e) => set('quoteRole', e.target.value)}
                className={inputClass}
                placeholder="Role, Company"
                aria-label="Quote author role"
              />
            </div>
          </section>
        </div>
      )}

      {tab === 'SEO & status' && (
        <div className="flex flex-col gap-4">
          <label>
            <span className={labelClass}>Meta description</span>
            <textarea
              value={form.metaDescription}
              onChange={(e) => set('metaDescription', e.target.value)}
              rows={3}
              maxLength={200}
              className={`${inputClass} resize-y`}
              placeholder="Shown in Google results and link previews."
            />
            <p className="text-xs text-gray-500 mt-1">
              {form.metaDescription.length}/200 — falls back to the summary if left blank.
            </p>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => set('isPublished', e.target.checked)}
              className="mt-1 h-4 w-4 cursor-pointer"
            />
            <span>
              <span className="block text-sm font-medium text-gray-700">Published</span>
              <span className="block text-xs text-gray-500">
                Drafts stay hidden from the website until this is ticked.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => set('isFeatured', e.target.checked)}
              className="mt-1 h-4 w-4 cursor-pointer"
            />
            <span>
              <span className="block text-sm font-medium text-gray-700">Featured</span>
              <span className="block text-xs text-gray-500">
                Highlighted at the top of the case studies page.
              </span>
            </span>
          </label>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button
          type="submit"
          disabled={saving || !form.title.trim()}
          className={primaryBtnClass}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className={cancelBtnClass}>
          Cancel
        </button>
      </div>
      {saveError && <p className="m-0 text-sm text-red-600">{saveError}</p>}
    </form>
  );
}

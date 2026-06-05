import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCategoriesList } from '../hooks/useCategoriesList';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryItem,
  type CategoryLinkedProduct,
} from '../api/categories';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '../components/Modal';
import { ImageUploadField } from '../components/ImageUploadField';
import { inputClass, labelClass, cancelBtnClass } from '../lib/styles';
import PageShell from '../components/PageShell';
import { EmptyState, ErrorState, InlineLoader } from '../components/EmptyState';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="m-0 mt-4 mb-2 text-sm font-semibold text-gray-600 border-b border-gray-200 pb-1 first:mt-0">
      {children}
    </h3>
  );
}

function CategoryForm({
  category,
  onSave,
  onCancel,
  isSaving,
  error,
  hideTitle,
}: {
  category: CategoryItem | null;
  onSave: (body: {
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
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
  error: string | null;
  hideTitle?: boolean;
}) {
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [name, setName] = useState(category?.name ?? '');
  const [tagline, setTagline] = useState(category?.tagline ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [image, setImage] = useState(category?.image ?? '');
  const [heroImage, setHeroImage] = useState(category?.heroImage ?? '');
  const [heroHeading, setHeroHeading] = useState(category?.heroHeading ?? '');
  const [heroDescription, setHeroDescription] = useState(category?.heroDescription ?? '');
  const [order, setOrder] = useState(category?.order ?? 0);
  const [metaTitle, setMetaTitle] = useState(category?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(category?.metaDescription ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      slug: slug.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      image: image.trim() || undefined,
      heroImage: heroImage.trim() || undefined,
      heroHeading: heroHeading.trim() || undefined,
      heroDescription: heroDescription.trim() || undefined,
      order,
      tagline: tagline.trim() || undefined,
      metaTitle: metaTitle.trim() || undefined,
      metaDescription: metaDescription.trim() || undefined,
    });
  };

  return (
    <section className={hideTitle ? undefined : 'mb-6'}>
      {!hideTitle && (
        <h2 className="m-0 mb-4 text-base font-semibold text-gray-600">
          {category ? 'Edit category' : 'Add category'}
        </h2>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-h-[80vh] overflow-y-auto pr-1">
        <SectionHeading>Basic info</SectionHeading>
        <label>
          <span className={labelClass}>Slug</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. acoustic"
            required
            className={inputClass}
          />
          <p className="m-0 mt-1 text-xs text-gray-500">
            Used in URLs: /products/{slug || '…'}
          </p>
        </label>
        <label>
          <span className={labelClass}>Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acoustic Solutions"
            required
            className={inputClass}
          />
        </label>
        <label>
          <span className={labelClass}>Tagline (optional)</span>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Short line under the category name"
            className={inputClass}
          />
        </label>
        <label>
          <span className={labelClass}>Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Full category description for the category page."
            className={`${inputClass} resize-y`}
          />
        </label>

        <SectionHeading>Catalog page hero</SectionHeading>
        <p className="m-0 text-xs text-gray-500">
          Shown at the top of /products/:slug (e.g. /products/acoustics). Leave blank to use site defaults.
        </p>
        <label>
          <span className={labelClass}>Hero heading (optional)</span>
          <input
            type="text"
            value={heroHeading}
            onChange={(e) => setHeroHeading(e.target.value)}
            placeholder="Where *design* meets emotion"
            className={inputClass}
          />
          <p className="m-0 mt-1 text-xs text-gray-500">
            Wrap a word in *asterisks* to show it in italic (e.g. Where *design* meets emotion).
          </p>
        </label>
        <label>
          <span className={labelClass}>Hero description (optional)</span>
          <textarea
            value={heroDescription}
            onChange={(e) => setHeroDescription(e.target.value)}
            rows={3}
            placeholder="We design spaces that unite function and beauty..."
            className={`${inputClass} resize-y`}
          />
        </label>
        <ImageUploadField
          label="Hero banner image (optional)"
          hint="Full-width photo below the heading. Falls back to the default site image when empty."
          value={heroImage}
          onChange={setHeroImage}
        />

        <SectionHeading>Media</SectionHeading>
        <ImageUploadField
          label="Card image (optional)"
          hint="Thumbnail for category lists and the admin table."
          value={image}
          onChange={setImage}
        />

        <SectionHeading>Display order</SectionHeading>
        <label>
          <span className={labelClass}>Order</span>
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value) || 0)}
            className={inputClass}
          />
          <p className="m-0 mt-1 text-xs text-gray-500">Lower numbers appear first in nav and lists.</p>
        </label>

        {category ? (
          <>
            <SectionHeading>Products in this category</SectionHeading>
            <CategoryLinkedProductsList products={category.linkedProducts} categorySlug={category.slug} />
          </>
        ) : null}

        <SectionHeading>SEO (optional)</SectionHeading>
        <label>
          <span className={labelClass}>Meta title</span>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder="Leave blank to use category name"
            className={inputClass}
          />
        </label>
        <label>
          <span className={labelClass}>Meta description</span>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={2}
            placeholder="For search results; 150–160 chars recommended."
            className={`${inputClass} resize-y`}
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={isSaving || !slug.trim() || !name.trim()}
            className="py-2 px-4 text-sm font-medium text-white bg-primary-600 border-0 rounded-lg cursor-pointer hover:bg-primary-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={cancelBtnClass}
          >
            Cancel
          </button>
        </div>
        {error && <p className="m-0 text-sm text-red-600">{error}</p>}
      </form>
    </section>
  );
}

function CategoryLinkedProductsList({
  products,
  categorySlug,
}: {
  products: CategoryLinkedProduct[] | undefined;
  categorySlug: string;
}) {
  const list = products ?? [];
  if (list.length === 0) {
    return (
      <p className="m-0 text-sm text-gray-500">
        No products use this category yet. Open{' '}
        <Link to="/dashboard/products" className="text-primary-600 hover:underline">
          Products
        </Link>{' '}
        and set <span className="font-mono">Category</span> to <span className="font-mono">{categorySlug}</span>.
      </p>
    );
  }
  return (
    <ul className="m-0 pl-4 list-disc text-sm text-gray-700 space-y-1">
      {list.map((p) => (
        <li key={p.slug}>
          <span className="font-medium">{p.title}</span>{' '}
          <span className="text-gray-400 font-mono text-xs">({p.slug})</span>
        </li>
      ))}
    </ul>
  );
}

export default function Categories() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useCategoriesList();
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });

  async function handleCreate(body: Parameters<typeof createCategory>[0]) {
    setSaving(true);
    setSaveError(null);
    try {
      await createCategory(body);
      setAdding(false);
      invalidate();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(body: Parameters<typeof updateCategory>[1]) {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateCategory(editing._id, body);
      setEditing(null);
      invalidate();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Products in this category will keep their categorySlug but the category will no longer appear in the nav.')) return;
    try {
      await deleteCategory(id);
      invalidate();
      if (editing?._id === id) setEditing(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  return (
    <PageShell
      title="Categories"
      action={
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="py-2 px-4 text-sm font-medium text-white bg-primary-600 border-0 rounded-lg cursor-pointer hover:bg-primary-700"
        >
          Add category
        </button>
      }
    >
        <Modal
          open={adding}
          onClose={() => { setAdding(false); setSaveError(null); }}
          title="Add category"
          maxWidth="max-w-xl"
        >
          <CategoryForm
            category={null}
            onSave={handleCreate}
            onCancel={() => { setAdding(false); setSaveError(null); }}
            isSaving={saving}
            error={saveError}
            hideTitle
          />
        </Modal>
        <Modal
          open={!!editing}
          onClose={() => { setEditing(null); setSaveError(null); }}
          title={editing ? `Edit: ${editing.name}` : ''}
          maxWidth="max-w-2xl"
        >
          {editing && (
            <CategoryForm
              category={editing}
              onSave={handleUpdate}
              onCancel={() => { setEditing(null); setSaveError(null); }}
              isSaving={saving}
              error={saveError}
              hideTitle
            />
          )}
        </Modal>

        <section className="mb-8">
          <h2 className="m-0 mb-4 text-base font-semibold text-gray-500 uppercase tracking-wider">
            All categories
          </h2>
          {isLoading && <InlineLoader />}
          {isError && <ErrorState message={error instanceof Error ? error.message : 'Failed to load categories'} />}
          {data && (
            <div className="overflow-x-auto rounded-xl border border-gray-300">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="py-2 px-3">Image</th>
                    <th className="py-2 px-3">Slug</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Tagline</th>
                    <th className="py-2 px-3">Products</th>
                    <th className="py-2 px-3">Description</th>
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
                          <img src={item.image} alt={item.name} className="h-10 w-auto max-w-[80px] rounded object-cover" />
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-sm">{item.slug}</td>
                      <td className="py-2 px-3">{item.name}</td>
                      <td className="py-2 px-3 text-gray-500 max-w-[140px] truncate">{item.tagline || '—'}</td>
                      <td className="py-2 px-3 align-top max-w-[220px]">
                        {item.linkedProducts && item.linkedProducts.length > 0 ? (
                          <div className="text-xs text-gray-700">
                            <span className="inline-flex items-center rounded-full bg-primary-50 text-primary-800 px-2 py-0.5 font-medium mb-1">
                              {item.linkedProducts.length} product
                              {item.linkedProducts.length === 1 ? '' : 's'}
                            </span>
                            <ul className="m-0 mt-1 pl-3 list-disc text-gray-600 max-h-[72px] overflow-y-auto">
                              {item.linkedProducts.slice(0, 6).map((p) => (
                                <li key={p.slug} className="truncate" title={p.title}>
                                  {p.title}
                                </li>
                              ))}
                            </ul>
                            {item.linkedProducts.length > 6 ? (
                              <p className="m-0 mt-0.5 text-gray-400 text-[11px]">
                                +{item.linkedProducts.length - 6} more — see Edit
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-500 max-w-[200px] truncate">
                        {item.description || '—'}
                      </td>
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
            <EmptyState message="No categories yet. Add a category or run backend seed:categories." />
          )}
        </section>
    </PageShell>
  );
}

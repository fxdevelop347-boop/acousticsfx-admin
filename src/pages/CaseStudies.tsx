import { useState } from 'react';
import { useCaseStudiesList } from '../hooks/useCaseStudiesList';
import {
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  type CaseStudyItem,
} from '../api/caseStudies';
import { useQueryClient } from '@tanstack/react-query';
import { inputClass, labelClass, cancelBtnClass } from '../lib/styles';
import { slugify } from '../lib/slugify';
import { ImageUploadField } from '../components/ImageUploadField';
import PageShell from '../components/PageShell';
import Modal from '../components/Modal';
import { EmptyState, ErrorState, InlineLoader } from '../components/EmptyState';

export default function CaseStudies() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useCaseStudiesList();
  const [editing, setEditing] = useState<CaseStudyItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({ slug: '', title: '', description: '', image: '', order: 0 });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'case-studies'] });

  const openAdd = () => {
    setAdding(true);
    setEditing(null);
    setForm({ slug: '', title: '', description: '', image: '', order: 0 });
    setSaveError(null);
  };

  const openEdit = (item: CaseStudyItem) => {
    setEditing(item);
    setAdding(false);
    setForm({
      slug: item.slug,
      title: item.title,
      description: item.description,
      image: item.image ?? '',
      order: item.order ?? 0,
    });
    setSaveError(null);
  };

  const closeForm = () => {
    setAdding(false);
    setEditing(null);
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const slug = editing ? form.slug.trim() : slugify(form.title.trim());
      const body = {
        slug,
        title: form.title.trim(),
        description: form.description.trim(),
        image: form.image.trim(),
        order: form.order,
      };
      if (editing) {
        await updateCaseStudy(editing._id, body);
      } else {
        await createCaseStudy(body);
      }
      closeForm();
      invalidate();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this case study?')) return;
    try {
      await deleteCaseStudy(id);
      if (editing?._id === id) closeForm();
      invalidate();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <PageShell
      title="Case studies"
      action={
        <button
          type="button"
          onClick={openAdd}
          className="py-2 px-4 text-sm font-medium text-white bg-primary-600 border-0 rounded-lg cursor-pointer hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
        >
          Add case study
        </button>
      }
    >
        <Modal
          open={adding || !!editing}
          onClose={closeForm}
          title={editing ? 'Edit case study' : 'Add case study'}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label>
              <span className={labelClass}>Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className={`${inputClass} resize-y`}
              />
            </label>
            <ImageUploadField
              label="Image"
              hint="Upload via ImageKit or paste URL."
              value={form.image}
              onChange={(url) => setForm((f) => ({ ...f, image: url }))}
            />
            <label>
              <span className={labelClass}>Order</span>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) || 0 }))}
                className={inputClass}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !form.title.trim()}
                className="py-2 px-4 text-sm font-medium text-white bg-primary-600 border-0 rounded-lg cursor-pointer hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className={cancelBtnClass}
              >
                Cancel
              </button>
            </div>
            {saveError && <p className="m-0 text-sm text-red-600">{saveError}</p>}
          </form>
        </Modal>

        <section className="mb-8">
          <h2 className="m-0 mb-4 text-base font-semibold text-gray-500 uppercase tracking-wider">
            All case studies
          </h2>
          {isLoading && <InlineLoader />}
          {isError && <ErrorState message={error instanceof Error ? error.message : 'Failed to load case studies'} />}
          {data && (
            <div className="overflow-x-auto rounded-xl border border-gray-300">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="py-2 px-3">Image</th>
                    <th className="py-2 px-3">Slug</th>
                    <th className="py-2 px-3">Title</th>
                    <th className="py-2 px-3">Order</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item._id} className="border-b border-gray-200 hover:bg-gray-100 transition-colors">
                      <td className="py-2 px-3">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="h-10 w-auto max-w-[80px] rounded object-cover" />
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-sm">{item.slug}</td>
                      <td className="py-2 px-3">{item.title}</td>
                      <td className="py-2 px-3">{item.order}</td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="py-1 px-2 text-sm text-primary-400 hover:underline mr-2"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          className="py-1 px-2 text-sm text-red-600 hover:underline"
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
            <EmptyState message="No case studies yet. Add one to get started." />
          )}
        </section>
    </PageShell>
  );
}

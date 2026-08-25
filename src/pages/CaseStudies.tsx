import { useState } from 'react';
import { Star } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCaseStudiesList } from '../hooks/useCaseStudiesList';
import {
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  type CaseStudyItem,
  type CaseStudyPayload,
} from '../api/caseStudies';
import { deleteBtnClass, editBtnClass } from '../lib/styles';
import PageShell from '../components/PageShell';
import Modal from '../components/Modal';
import CaseStudyForm from '../components/CaseStudyForm';
import { EmptyState, ErrorState, InlineLoader } from '../components/EmptyState';

/** Records created before `isPublished` existed are live. */
function isLive(item: CaseStudyItem): boolean {
  return item.isPublished !== false;
}

function StatusPill({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-xs font-medium ${
        live ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-green-500' : 'bg-gray-400'}`}
      />
      {live ? 'Live' : 'Draft'}
    </span>
  );
}

export default function CaseStudies() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useCaseStudiesList();
  const [editing, setEditing] = useState<CaseStudyItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'case-studies'] });

  const openAdd = () => {
    setAdding(true);
    setEditing(null);
    setSaveError(null);
  };

  const openEdit = (item: CaseStudyItem) => {
    setEditing(item);
    setAdding(false);
    setSaveError(null);
  };

  const closeForm = () => {
    setAdding(false);
    setEditing(null);
    setSaveError(null);
  };

  const handleSubmit = async (payload: CaseStudyPayload) => {
    setSaving(true);
    setSaveError(null);
    try {
      if (editing) {
        await updateCaseStudy(editing._id, payload);
      } else {
        await createCaseStudy(payload);
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

  const open = adding || !!editing;

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
        open={open}
        onClose={closeForm}
        title={editing ? 'Edit case study' : 'Add case study'}
        maxWidth="max-w-2xl"
      >
        {/* Keyed so the form resets its internal state between records. */}
        {open && (
          <CaseStudyForm
            key={editing?._id ?? 'new'}
            editing={editing}
            saving={saving}
            saveError={saveError}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        )}
      </Modal>

      <section className="mb-8">
        <h2 className="m-0 mb-4 text-base font-semibold text-gray-500 uppercase tracking-wider">
          All case studies
        </h2>
        {isLoading && <InlineLoader />}
        {isError && (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load case studies'}
          />
        )}
        {data && data.items.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-300">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-2 px-3">Image</th>
                  <th className="py-2 px-3">Title</th>
                  <th className="py-2 px-3">Industry</th>
                  <th className="py-2 px-3">Client</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Order</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <td className="py-2 px-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="h-10 w-auto max-w-[80px] rounded object-cover"
                        />
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1.5">
                        {item.isFeatured && (
                          <Star
                            size={14}
                            className="text-amber-500 fill-amber-500 flex-shrink-0"
                            aria-label="Featured"
                          />
                        )}
                        {item.title}
                      </span>
                      <span className="block font-mono text-xs text-gray-400">
                        {item.slug}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-600">
                      {item.industry || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-600">
                      {item.client || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2 px-3">
                      <StatusPill live={isLive(item)} />
                    </td>
                    <td className="py-2 px-3">{item.order}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className={`${editBtnClass} mr-2`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item._id)}
                        className={deleteBtnClass}
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
        {data && data.items.length === 0 && (
          <EmptyState message="No case studies yet. Add one to get started." />
        )}
      </section>
    </PageShell>
  );
}

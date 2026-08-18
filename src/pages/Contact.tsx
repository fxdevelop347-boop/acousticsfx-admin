import { useState } from 'react';
import { Trash2, Mail, Phone, Building2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useContactSubmissionsList } from '../hooks/useContactSubmissionsList';
import {
  deleteContactSubmission,
  type ContactSubmissionItem,
} from '../api/contactSubmissions';
import PageShell from '../components/PageShell';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { CompactLoader } from '../components/EmptyState';

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Short "12 Aug, 11:51" for the table; the modal shows the full timestamp. */
function formatDateShort(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString(
      undefined,
      { hour: '2-digit', minute: '2-digit' }
    )}`;
  } catch {
    return iso;
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-gray-400 flex-shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <span className="block text-sm text-gray-800 break-words">{children}</span>
      </span>
    </div>
  );
}

export default function Contact() {
  const queryClient = useQueryClient();
  const [skip, setSkip] = useState(0);
  const { data, isLoading, isError, error } = useContactSubmissionsList({
    limit: PAGE_SIZE,
    skip,
  });
  const [selected, setSelected] = useState<ContactSubmissionItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const items = data?.items ?? [];

  const handleDelete = async (row: ContactSubmissionItem) => {
    if (!confirm(`Delete the submission from ${row.name}? This cannot be undone.`))
      return;
    setDeleteError(null);
    setDeletingId(row._id);
    try {
      await deleteContactSubmission(row._id);
      if (selected?._id === row._id) setSelected(null);
      // Deleting the last row of a page would leave the offset past the end.
      if (skip > 0 && items.length === 1) setSkip(Math.max(0, skip - PAGE_SIZE));
      queryClient.invalidateQueries({ queryKey: ['admin', 'contact-submissions'] });
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete submission');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageShell title="Contact">
      <section className="mb-8">
        <p className="m-0 p-6 text-[0.9375rem] text-gray-500 bg-gray-100 border border-dashed border-gray-300 rounded-xl">
          Edit contact information: address, phone, email, and social links (coming soon).
        </p>
      </section>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Enquiry details"
        maxWidth="max-w-xl"
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold">
                  {initials(selected.name)}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-gray-900 break-words">
                    {selected.name}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {formatDate(selected.createdAt)}
                  </span>
                </span>
              </div>
              <span className="flex-shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {selected.subject}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-gray-200 p-4">
              <DetailRow icon={<Building2 size={16} />} label="Company">
                {selected.company || <span className="text-gray-400">Not provided</span>}
              </DetailRow>
              <DetailRow icon={<Mail size={16} />} label="Email">
                <a
                  href={`mailto:${selected.email}`}
                  className="text-primary-600 hover:underline"
                >
                  {selected.email}
                </a>
              </DetailRow>
              <DetailRow icon={<Phone size={16} />} label="Phone">
                {selected.phone ? (
                  <a href={`tel:${selected.phone}`} className="text-primary-600 hover:underline">
                    {selected.phone}
                  </a>
                ) : (
                  <span className="text-gray-400">Not provided</span>
                )}
              </DetailRow>
            </div>

            <div>
              <span className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
                Message
              </span>
              <p className="m-0 whitespace-pre-wrap break-words rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm leading-relaxed text-gray-800">
                {selected.message}
              </p>
            </div>

            <div className="flex gap-2 pt-1 border-t border-gray-100">
              <a
                href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                className="py-2 px-4 text-sm font-medium text-white bg-primary-600 rounded-lg no-underline hover:bg-primary-700"
              >
                Reply by email
              </a>
              <button
                type="button"
                onClick={() => handleDelete(selected)}
                disabled={deletingId === selected._id}
                className="inline-flex items-center gap-1.5 py-2 px-4 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg cursor-pointer hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 size={14} />
                {deletingId === selected._id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <section>
        <h2 className="text-lg font-medium text-gray-800 mb-1">Form submissions</h2>
        <p className="m-0 mb-4 text-sm text-gray-500">
          Select a row to read the full enquiry.
        </p>

        {isLoading && <CompactLoader />}
        {isError && (
          <p className="text-red-600 text-sm">
            {error instanceof Error ? error.message : 'Failed to load submissions'}
          </p>
        )}
        {deleteError && <p className="text-red-600 text-sm mb-3">{deleteError}</p>}
        {items.length === 0 && skip === 0 && !isLoading && (
          <p className="text-gray-500 text-sm">No submissions yet.</p>
        )}

        {items.length > 0 && (
          <>
            <div className="overflow-x-auto border border-gray-300 rounded-lg">
              <table className="w-full text-sm text-left table-fixed min-w-[860px]">
                <thead className="bg-white text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium w-[15%]">Contact</th>
                    <th className="px-4 py-3 font-medium w-[17%]">Company</th>
                    <th className="px-4 py-3 font-medium w-[22%]">Email</th>
                    <th className="px-4 py-3 font-medium w-[12%]">Phone</th>
                    <th className="px-4 py-3 font-medium w-[24%]">Message</th>
                    <th className="px-4 py-3 font-medium w-[10%] text-right">Received</th>
                    <th className="px-4 py-3 font-medium w-14" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((row) => (
                    <tr
                      key={row._id}
                      onClick={() => setSelected(row)}
                      className="bg-gray-50/50 hover:bg-blue-50/60 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 break-words">
                        {row.name}
                      </td>
                      {/* Company gets its own column and wraps — it used to be
                          buried in the truncated message and was unreadable. */}
                      <td className="px-4 py-3 text-gray-700 break-words">
                        {row.company || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`mailto:${row.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary-400 hover:underline break-all"
                        >
                          {row.email}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-500 break-words">
                        {row.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="block truncate" title={row.message}>
                          {row.message}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-right whitespace-nowrap">
                        {formatDateShort(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(row);
                          }}
                          disabled={deletingId === row._id}
                          title={`Delete submission from ${row.name}`}
                          aria-label={`Delete submission from ${row.name}`}
                          className="p-1.5 text-gray-400 bg-transparent border-0 rounded-md cursor-pointer hover:text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              total={data!.total}
              limit={data!.limit}
              skip={data!.skip}
              onPageChange={setSkip}
            />
          </>
        )}
      </section>
    </PageShell>
  );
}

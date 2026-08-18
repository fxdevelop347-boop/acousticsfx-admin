import { useState } from 'react';
import { useContactSubmissionsList } from '../hooks/useContactSubmissionsList';
import PageShell from '../components/PageShell';
import Pagination from '../components/Pagination';
import { CompactLoader } from '../components/EmptyState';

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function Contact() {
  const [skip, setSkip] = useState(0);
  const { data, isLoading, isError, error } = useContactSubmissionsList({ limit: PAGE_SIZE, skip });

  return (
    <PageShell title="Contact">
        <section className="mb-8">
          <p className="m-0 p-6 text-[0.9375rem] text-gray-500 bg-gray-100 border border-dashed border-gray-300 rounded-xl">
            Edit contact information: address, phone, email, and social links (coming soon).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-gray-800 mb-4">Form submissions</h2>
          {isLoading && <CompactLoader />}
          {isError && (
            <p className="text-red-600 text-sm">
              {error instanceof Error ? error.message : 'Failed to load submissions'}
            </p>
          )}
          {data?.items && data.items.length === 0 && skip === 0 && (
            <p className="text-gray-500 text-sm">No submissions yet.</p>
          )}
          {data?.items && data.items.length > 0 && (
            <>
              <div className="overflow-x-auto border border-gray-300 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Subject</th>
                      <th className="px-4 py-3 font-medium">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.items.map((row) => (
                      <tr key={row._id} className="bg-gray-50/50 hover:bg-blue-50/60">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-4 py-3">{row.name}</td>
                        <td className="px-4 py-3">
                          <a href={`mailto:${row.email}`} className="text-primary-400 hover:underline">
                            {row.email}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{row.phone ?? '—'}</td>
                        <td className="px-4 py-3">{row.subject}</td>
                        <td className="px-4 py-3 max-w-xs truncate" title={row.message}>
                          {row.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                total={data.total}
                limit={data.limit}
                skip={data.skip}
                onPageChange={setSkip}
              />
            </>
          )}
        </section>
    </PageShell>
  );
}

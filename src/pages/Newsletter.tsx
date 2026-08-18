import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNewsletterSubscriptionsList } from '../hooks/useNewsletterSubscriptionsList';
import { addNewsletterSubscription } from '../api/newsletter';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { inputClass, labelClass, cancelBtnClass } from '../lib/styles';
import PageShell from '../components/PageShell';
import { CompactLoader } from '../components/EmptyState';

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function Newsletter() {
  const queryClient = useQueryClient();
  const [skip, setSkip] = useState(0);
  const { data, isLoading, isError, error } = useNewsletterSubscriptionsList({ limit: PAGE_SIZE, skip });
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [newEmails, setNewEmails] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addStatus, setAddStatus] = useState<{ type: 'error'|'success', msg: string } | null>(null);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'info'>('idle');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const items = data?.items ?? [];
  const totalCount = data?.total ?? 0;
  const pageItemCount = items.length;
  const selectedCount = selectedIds.size;
  const allPageSelected = pageItemCount > 0 && items.every((i) => selectedIds.has(i._id));

  const handleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        items.forEach((i) => next.delete(i._id));
      } else {
        items.forEach((i) => next.add(i._id));
      }
      return next;
    });
  };

  const handleToggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenSendModal = () => {
    setSubject('');
    setMessage('');
    setSendStatus('idle');
    setSendModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setNewEmails('');
    setAddStatus(null);
    setAddModalOpen(true);
  };

  const handleAddEmails = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStatus(null);
    setIsAdding(true);
    
    // Split by commas, newlines, or spaces
    const emailsToProcess = newEmails
      .split(/[\n, ]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emailsToProcess.length === 0) {
      setAddStatus({ type: 'error', msg: 'Please provide at least one email.' });
      setIsAdding(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const email of emailsToProcess) {
      try {
        const res = await addNewsletterSubscription({ email });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setIsAdding(false);
    if (successCount > 0) {
      setNewEmails('');
      setAddStatus({ type: 'success', msg: `Successfully added ${successCount} email(s). ${failCount > 0 ? `Failed: ${failCount}` : ''}` });
      queryClient.invalidateQueries({ queryKey: ['admin', 'newsletter-subscriptions'] });
      // Clear message after 3 seconds
      setTimeout(() => setAddStatus(null), 3000);
    } else {
      setAddStatus({ type: 'error', msg: `Failed to add provided emails. Make sure they are valid.` });
    }
  };

  const handleSendNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    setSendStatus('info');
  };

  return (
    <PageShell
      title="Newsletter"
      action={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="py-2 px-4 text-sm font-medium text-primary-600 bg-white border border-primary-600 rounded-lg cursor-pointer hover:bg-primary-50"
          >
            Add emails
          </button>
          <button
            type="button"
            onClick={handleOpenSendModal}
            className="py-2 px-4 text-sm font-medium text-white bg-primary-600 border-0 rounded-lg cursor-pointer hover:bg-primary-700"
          >
            Send newsletter
          </button>
        </div>
      }
    >

        <Modal
          open={sendModalOpen}
          onClose={() => setSendModalOpen(false)}
          title="Send newsletter email"
          maxWidth="max-w-lg"
        >
          <p className="text-gray-500 text-sm mb-4">
            {totalCount === 0
              ? 'No subscribers yet. Add signups from the public site first.'
              : selectedCount === 0
                ? 'No subscribers selected. Use Select all or check individuals in the list below, then open this again.'
                : `This will send an email to ${selectedCount} selected subscriber${selectedCount === 1 ? '' : 's'}.`}
          </p>
          <form onSubmit={handleSendNewsletter} className="flex flex-col gap-4">
            <label>
              <span className={labelClass}>Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Newsletter subject"
                required
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your newsletter content..."
                rows={6}
                required
                className={`${inputClass} resize-y`}
              />
            </label>
            {sendStatus === 'info' && (
              <p className="text-amber-600 text-sm">
                Frontend only — sending is not connected to the backend yet.
              </p>
            )}
            {sendStatus === 'success' && (
              <p className="text-green-600 text-sm">Email sent successfully.</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={totalCount === 0 || selectedCount === 0}
                className="py-2 px-4 text-sm font-medium text-white bg-primary-600 border-0 rounded-lg cursor-pointer hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send newsletter
              </button>
              <button
                type="button"
                onClick={() => setSendModalOpen(false)}
                className={cancelBtnClass}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Add manual emails"
          maxWidth="max-w-md"
        >
          <p className="text-gray-500 text-sm mb-4">
            Enter multiple emails separated by commas or new lines. They will be added to the subscriber list.
          </p>
          <form onSubmit={handleAddEmails} className="flex flex-col gap-4">
            <label>
              <textarea
                value={newEmails}
                onChange={(e) => setNewEmails(e.target.value)}
                placeholder="email1@example.com, email2@example.com..."
                rows={5}
                required
                className={`${inputClass} resize-y w-full`}
              />
            </label>
            {addStatus && (
              <p className={addStatus.type === 'error' ? 'text-red-500 text-sm' : 'text-green-500 text-sm'}>
                {addStatus.msg}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isAdding || !newEmails.trim()}
                className="py-2 px-4 text-sm font-medium text-white bg-primary-600 border-0 rounded-lg cursor-pointer hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? 'Adding...' : 'Add emails'}
              </button>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className={cancelBtnClass}
              >
                Close
              </button>
            </div>
          </form>
        </Modal>
        <section>
          <p className="m-0 mb-2 text-[0.9375rem] text-gray-500">
            Emails submitted via the newsletter signup on the public site.
          </p>
          {pageItemCount > 0 && (
            <div className="mb-3 flex items-center gap-4">
              <button
                type="button"
                onClick={handleSelectAllPage}
                className="text-sm text-primary-400 hover:underline cursor-pointer"
              >
                {allPageSelected ? 'Deselect page' : 'Select page'}
              </button>
              {selectedCount > 0 && (
                <span className="text-gray-500 text-sm">
                  {selectedCount} selected
                </span>
              )}
            </div>
          )}
          {isLoading && <CompactLoader />}
          {isError && (
            <p className="text-red-600 text-sm">
              {error instanceof Error ? error.message : 'Failed to load subscriptions'}
            </p>
          )}
          {pageItemCount === 0 && skip === 0 && !isLoading && (
            <p className="text-gray-500 text-sm">No subscriptions yet.</p>
          )}
          {pageItemCount > 0 && (
            <>
              <div className="overflow-x-auto border border-gray-300 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-gray-600">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={handleSelectAllPage}
                          aria-label={allPageSelected ? 'Deselect page' : 'Select page'}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((row) => (
                      <tr key={row._id} className="bg-gray-50/50 hover:bg-blue-50/60">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row._id)}
                            onChange={() => handleToggleOne(row._id)}
                            aria-label={`Select ${row.email}`}
                            className="rounded border-gray-300 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <a href={`mailto:${row.email}`} className="text-primary-400 hover:underline">
                            {row.email}
                          </a>
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

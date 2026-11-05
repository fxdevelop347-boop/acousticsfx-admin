import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteNewsletterSubscription,
  getNewsletterCampaign,
  listNewsletterCampaigns,
  resendFailedNewsletter,
  updateNewsletterSubscriptionEmail,
  type NewsletterCampaignFailure,
} from '../api/newsletter';
import { cancelBtnClass, deleteBtnClass, editBtnClass, inputClass, primaryBtnClass } from '../lib/styles';
import Modal from './Modal';
import Pagination from './Pagination';

const PAGE_SIZE = 5;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

/** Anyone removed or unsubscribed stays on record as missed, but must not be emailed again. */
function canResendTo(f: NewsletterCampaignFailure): boolean {
  return f.status !== 'removed' && f.status !== 'unsubscribed';
}

function failuresToCsv(failures: NewsletterCampaignFailure[]): string {
  const cell = (value: string) => {
    // A leading formula character would run as a formula when opened in a spreadsheet.
    const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = failures.map((f) => [f.email, f.reason ?? 'Reason not recorded', f.status].map(cell).join(','));
  return ['Email,Reason,Status', ...rows].join('\r\n');
}

function downloadCsv(failures: NewsletterCampaignFailure[]) {
  const url = URL.createObjectURL(new Blob([failuresToCsv(failures)], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'newsletter-failed-addresses.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function FailedAddresses({ campaignId }: { campaignId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'newsletter-campaigns', 'detail', campaignId],
    queryFn: () => getNewsletterCampaign(campaignId),
  });
  const [editing, setEditing] = useState<{ id: string; email: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  if (isLoading) return <p className="text-gray-500 text-sm">Loading…</p>;
  if (isError || !data) {
    return (
      <p className="text-red-600 text-sm">
        {error instanceof Error ? error.message : 'Failed to load this send'}
      </p>
    );
  }

  const resendable = data.failures.filter(canResendTo);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'newsletter-campaigns'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'newsletter-subscriptions'] });
  };

  /** Runs one action at a time, so a resend cannot start while an address is being saved. */
  const run = async (action: () => Promise<string>) => {
    setIsBusy(true);
    setNotice(null);
    try {
      setNotice({ type: 'success', msg: await action() });
    } catch (e) {
      setNotice({ type: 'error', msg: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setIsBusy(false);
      refresh();
    }
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    const { id, email } = editing;
    return run(async () => {
      const res = await updateNewsletterSubscriptionEmail(id, email);
      setEditing(null);
      return `Address corrected to ${res.email}. Resend when you are ready.`;
    });
  };

  const handleRemove = (id: string, email: string) => {
    if (!confirm(`Remove ${email} from the subscriber list?`)) return;
    return run(async () => {
      await deleteNewsletterSubscription(id);
      return `${email} removed from the subscriber list.`;
    });
  };

  const handleResend = () => {
    const count = resendable.length;
    if (
      !confirm(
        `Send "${data.subject}" to ${count} address${count === 1 ? '' : 'es'}? The ${data.sentCount} already sent to will not get another copy.`
      )
    )
      return;
    return run(async () => {
      const res = await resendFailedNewsletter(campaignId);
      if (res.failed > 0) throw new Error(`Sent to ${res.sent} of ${res.total}. ${res.failed} still failed.`);
      return `Sent to ${res.sent} of ${res.total}.`;
    });
  };

  const handleCopy = () =>
    run(async () => {
      await navigator.clipboard.writeText(data.failures.map((f) => f.currentEmail ?? f.email).join('\n'));
      return 'Addresses copied.';
    });

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-sm text-gray-600">
        Sent to {data.sentCount} of {data.recipientCount} on {formatDate(data.createdAt)}.
        {data.lastResendAt && ` Last resent ${formatDate(data.lastResendAt)}.`}
      </p>

      {data.failures.length === 0 && (
        <p className="m-0 text-sm text-green-600">Every address on this send has been sent to.</p>
      )}

      {data.failedCount > data.failures.length && (
        <p className="m-0 text-sm text-gray-600">
          Showing the first {data.failures.length} of {data.failedCount} failed addresses.
        </p>
      )}

      {data.failures.length > 0 && (
        <div className="overflow-x-auto border border-gray-300 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.failures.map((f) => {
                const isEditing = editing !== null && editing.id === f.subscriptionId;
                const corrected = f.currentEmail !== null && f.currentEmail !== f.email;
                return (
                  <tr key={f.subscriptionId ?? f.email}>
                    <td className="px-3 py-2 break-all">
                      {isEditing ? (
                        <input
                          type="email"
                          value={editing.email}
                          onChange={(e) => setEditing({ id: editing.id, email: e.target.value })}
                          aria-label={`Corrected address for ${f.email}`}
                          className={inputClass}
                        />
                      ) : (
                        <>
                          <span className="font-medium text-gray-900">{f.currentEmail ?? f.email}</span>
                          {corrected && <span className="block text-xs text-gray-500">was {f.email}</span>}
                          {!canResendTo(f) && (
                            <span className="block text-xs text-gray-500">
                              {f.status === 'removed' ? 'Removed from list' : 'Unsubscribed'}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{f.reason ?? 'Reason not recorded'}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {isEditing ? (
                        <>
                          <button type="button" onClick={handleSaveEdit} disabled={isBusy} className={editBtnClass}>
                            Save
                          </button>
                          <button type="button" onClick={() => setEditing(null)} disabled={isBusy} className={editBtnClass}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        f.subscriptionId &&
                        f.currentEmail && (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditing({ id: f.subscriptionId as string, email: f.currentEmail as string })}
                              disabled={isBusy}
                              className={editBtnClass}
                            >
                              Correct
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemove(f.subscriptionId as string, f.currentEmail as string)}
                              disabled={isBusy}
                              className={deleteBtnClass}
                            >
                              Remove
                            </button>
                          </>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {notice && (
        <p className={notice.type === 'error' ? 'm-0 text-red-600 text-sm' : 'm-0 text-green-600 text-sm'}>
          {notice.msg}
        </p>
      )}

      {data.failures.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {resendable.length > 0 && (
            <button type="button" onClick={handleResend} disabled={isBusy || editing !== null} className={primaryBtnClass}>
              {isBusy ? 'Working…' : `Resend to ${resendable.length} failed`}
            </button>
          )}
          <button type="button" onClick={handleCopy} disabled={isBusy} className={cancelBtnClass}>
            Copy addresses
          </button>
          <button type="button" onClick={() => downloadCsv(data.failures)} className={cancelBtnClass}>
            Download CSV
          </button>
        </div>
      )}

      <p className="m-0 text-xs text-gray-500">
        Sent means the mail provider accepted the message. An address it accepted can still bounce later, and those
        bounces only appear in the Resend dashboard.
      </p>
    </div>
  );
}

export default function NewsletterSendHistory() {
  const [skip, setSkip] = useState(0);
  const [viewing, setViewing] = useState<{ id: string; subject: string } | null>(null);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'newsletter-campaigns', 'list', skip],
    queryFn: () => listNewsletterCampaigns({ limit: PAGE_SIZE, skip }),
  });

  if (isLoading) return null;

  return (
    <section className="mb-8">
      <h2 className="m-0 mb-2 text-base font-semibold text-gray-900">Send history</h2>
      {isError && (
        <p className="text-red-600 text-sm">{error instanceof Error ? error.message : 'Failed to load send history'}</p>
      )}
      {data && data.items.length === 0 && <p className="text-gray-500 text-sm">No newsletters sent yet.</p>}
      {data && data.items.length > 0 && (
        <>
          <div className="overflow-x-auto border border-gray-300 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 font-medium">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.items.map((c) => (
                  <tr key={c._id} className="bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-900">{c.subject}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {c.sentCount} of {c.recipientCount}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.failedCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setViewing({ id: c._id, subject: c.subject })}
                          className="text-red-600 font-medium hover:underline cursor-pointer bg-transparent border-0 p-0"
                        >
                          View {c.failedCount} failed
                        </button>
                      ) : (
                        <span className="text-gray-500">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={data.total} limit={data.limit} skip={data.skip} onPageChange={setSkip} />
        </>
      )}
      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? `Failed addresses: ${viewing.subject}` : undefined}
        maxWidth="max-w-3xl"
      >
        {viewing && <FailedAddresses campaignId={viewing.id} />}
      </Modal>
    </section>
  );
}

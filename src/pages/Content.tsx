import { useState, useRef } from 'react';
import { useContentList } from '../hooks/useContentList';
import { useUpdateContentMutation } from '../hooks/useUpdateContentMutation';
import type { ContentItem } from '../api/content';
import { inputClass, labelClass, primaryBtnClass, cancelBtnClass } from '../lib/styles';
import { ImageUploadField } from '../components/ImageUploadField';
import { VideoUploadField } from '../components/VideoUploadField';
import PageShell from '../components/PageShell';
import { EmptyState, ErrorState, InlineLoader } from '../components/EmptyState';

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

const KEY_LABELS: Record<string, string> = {
  'home.services.image': 'Home – Services: image',
  'home.services.subtitle': 'Home – Services: subtitle',
  'home.services.description': 'Home – Services: description',
  'home.services.ctaText': 'Home – Services: button text',
  'home.services.ctaLink': 'Home – Services: button link',
  'home.about.label': 'Home – About: label',
  'home.about.heading': 'Home – About: heading',
  'home.about.body': 'Home – About: body',
  'home.about.ctaLabel': 'Home – About: button text',
  'home.about.ctaLink': 'Home – About: button link',
  'home.about.image': 'Home – About: image',
  'home.about.backgroundImage': 'Home – About: background image',
  'about.innovation.image': 'About – Story Innovation: poster image (optional; YouTube thumbnail used when empty)',
  'about.innovation.video': 'About – Story Innovation: video',
};

function labelForKey(key: string) {
  return KEY_LABELS[key] ?? key;
}

export default function Content() {
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [formValue, setFormValue] = useState('');
  const [formType, setFormType] = useState<'text' | 'image' | 'video'>('text');
  const [filter, setFilter] = useState('');

  const { data, isLoading, isError, error } = useContentList({ limit: 200 });
  const updateMutation = useUpdateContentMutation();
  const topRef = useRef<HTMLDivElement>(null);

  function startEdit(item: ContentItem) {
    setEditing(item);
    setFormValue(item.value);
    setFormType((item.type as 'text' | 'image' | 'video') || 'text');
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditing(null);
  }

  async function handleSave() {
    if (!editing) return;
    try {
      await updateMutation.mutateAsync({
        key: editing.key,
        value: formValue,
        type: formType,
      });
      setEditing(null);
    } catch {
      // Error surfaced via mutation
    }
  }

  return (
    <PageShell title="Site content">
        <div ref={topRef} />
        {editing && (
          <section className="mb-6">
            <h2 className="m-0 mb-4 text-base font-semibold text-gray-600">
              Edit: {labelForKey(editing.key)}
            </h2>
            <p className="m-0 mb-3 font-mono text-xs text-gray-400">{editing.key}</p>
            <div className="flex flex-col gap-3 max-w-[600px]">
              {formType === 'image' ? (
                <ImageUploadField
                  label="Value"
                  hint="Upload via ImageKit or paste URL."
                  value={formValue}
                  onChange={setFormValue}
                />
              ) : formType === 'video' ? (
                <VideoUploadField
                  label="Value"
                  hint="Upload MP4/WebM/MOV via ImageKit, or paste a direct video or YouTube URL."
                  value={formValue}
                  onChange={setFormValue}
                />
              ) : (
                <label>
                  <span className={labelClass}>Value</span>
                  <textarea
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    rows={4}
                    className={`${inputClass} resize-y`}
                  />
                </label>
              )}
              <label>
                <span className={labelClass}>Type</span>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as 'text' | 'image' | 'video')}
                  className={inputClass}
                >
                  <option value="text">Text</option>
                  <option value="image">Image (URL)</option>
                  <option value="video">Video (URL)</option>
                </select>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className={primaryBtnClass}
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={cancelEdit} className={cancelBtnClass}>
                  Cancel
                </button>
              </div>
              {updateMutation.isError && (
                <p className="m-0 text-sm text-red-600">
                  {(updateMutation.error as Error).message}
                </p>
              )}
            </div>
          </section>
        )}

        <section className="mb-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="m-0 text-base font-semibold text-gray-500 uppercase tracking-wider">
              Content keys
            </h2>
            <label className="flex flex-col gap-1 max-w-md w-full">
              <span className={labelClass}>Filter by key or label</span>
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="e.g. home.services"
                className={inputClass}
              />
            </label>
          </div>
          {isLoading && <InlineLoader />}
          {isError && <ErrorState message={error instanceof Error ? error.message : 'Failed to load content'} />}
          {data && (
            <div className="overflow-x-auto rounded-xl border border-gray-300">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="py-2 px-3">Key</th>
                    <th className="py-2 px-3">Value (preview)</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Updated</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items
                    .filter((item) => {
                      const q = filter.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        item.key.toLowerCase().includes(q) ||
                        labelForKey(item.key).toLowerCase().includes(q)
                      );
                    })
                    .map((item) => (
                    <tr key={item.key} className="border-b border-gray-200 hover:bg-blue-50/60 transition-colors">
                      <td className="py-2 px-3">
                        <div className="text-sm text-gray-800">{labelForKey(item.key)}</div>
                        <div className="font-mono text-xs text-gray-400">{item.key}</div>
                      </td>
                      <td className="py-2 px-3 max-w-[300px]">
                        {item.type === 'image' && item.value ? (
                          <img src={item.value} alt={item.key} className="h-10 w-auto max-w-[120px] rounded object-cover" />
                        ) : item.type === 'video' && item.value ? (
                          <span className="truncate block text-primary-600">Video: {truncate(item.value, 48)}</span>
                        ) : (
                          <span className="truncate block">{truncate(item.value, 60)}</span>
                        )}
                      </td>
                      <td className="py-2 px-3">{item.type ?? 'text'}</td>
                      <td className="py-2 px-3 text-sm">
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="py-1 px-2 text-sm text-primary-400 hover:underline"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data.items.filter((item) => {
                    const q = filter.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      item.key.toLowerCase().includes(q) ||
                      labelForKey(item.key).toLowerCase().includes(q)
                    );
                  }).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 px-3 text-center text-sm text-gray-500">
                        No keys match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {data && data.items.length === 0 && (
            <EmptyState message="No content yet. Run backend seed:content to add defaults." />
          )}
        </section>
    </PageShell>
  );
}

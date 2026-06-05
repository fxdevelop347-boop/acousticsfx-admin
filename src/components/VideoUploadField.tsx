import { useRef, useState } from 'react';
import { uploadVideo } from '../api/upload';
import { inputClass, labelClass } from '../lib/styles';

const buttonClass =
  'py-2 px-3 text-sm font-medium text-white bg-primary-600 border-0 rounded-lg cursor-pointer hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400/50 disabled:opacity-60';

interface VideoUploadFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
}

export function VideoUploadField({ label, hint, value, onChange }: VideoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      alert('Please choose a video file (MP4, WebM, or MOV).');
      return;
    }
    e.target.value = '';
    setUploading(true);
    try {
      const { url } = await uploadVideo(file);
      onChange(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <span className={labelClass}>{label}</span>
      {hint && <p className="text-xs text-gray-500 mb-1">{hint}</p>}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-center flex-wrap">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={buttonClass}
          >
            {uploading ? 'Uploading…' : 'Choose video to upload'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov"
            className="hidden"
            onChange={handleFile}
          />
          {value && (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-400 hover:underline"
            >
              Open current video
            </a>
          )}
        </div>
        {value && (
          <video
            src={value}
            controls
            className="w-full max-w-[360px] rounded-lg border border-gray-300 bg-black"
          />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="Or paste a video URL (MP4, WebM, or YouTube link)"
        />
      </div>
    </div>
  );
}

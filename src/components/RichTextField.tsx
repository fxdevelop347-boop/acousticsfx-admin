import { useRef, useCallback, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import { uploadImage } from '../api/upload';
import { labelClass } from '../lib/styles';
import 'react-quill-new/dist/quill.snow.css';
import './RichTextField.css';

/**
 * Toolbar presets. `article` is the full kit for long blog posts; `story` is the
 * subset that makes sense inside a case study section — headings and lists to
 * break up prose, without colours or embedded images competing with the page design.
 */
const TOOLBARS = {
  article: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['blockquote'],
    [{ color: [] }, { background: [] }],
    ['clean'],
  ],
  story: [
    [{ header: [2, 3, 4, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'blockquote'],
    ['clean'],
  ],
} as const;

export type RichTextPreset = keyof typeof TOOLBARS;

/** Quill re-registers its modules whenever this object identity changes, so the
 *  configs are built once at module scope rather than per render. */
const MODULES: Record<RichTextPreset, { toolbar: unknown }> = {
  article: { toolbar: TOOLBARS.article },
  story: { toolbar: TOOLBARS.story },
};

interface RichTextFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** `article` adds image upload and colours. Defaults to `story`. */
  preset?: RichTextPreset;
  /** Editor height in pixels. Defaults to 220. */
  minHeight?: number;
}

export function RichTextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  preset = 'story',
  minHeight = 220,
}: RichTextFieldProps) {
  const quillRef = useRef<ReactQuill>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const allowsImages = preset === 'article';

  const insertImage = useCallback((url: string) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const range = quill.getSelection(true) ?? { index: quill.getLength(), length: 0 };
    quill.insertEmbed(range.index, 'image', url);
    quill.setSelection(range.index + 1);
  }, []);

  useEffect(() => {
    if (!allowsImages) return;
    const id = setTimeout(() => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;
      const toolbar = quill.getModule('toolbar') as { addHandler: (name: string, fn: () => void) => void };
      toolbar?.addHandler('image', () => fileInputRef.current?.click());
    }, 0);
    return () => clearTimeout(id);
  }, [allowsImages]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file?.type.startsWith('image/')) {
      alert('Please choose an image file (JPEG, PNG, GIF, WebP, or AVIF).');
      return;
    }
    try {
      const { url } = await uploadImage(file);
      insertImage(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <div className="rich-text-field">
      <span className={labelClass}>{label}</span>
      {hint && <p className="text-xs text-gray-500 mb-1">{hint}</p>}
      {allowsImages && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          className="hidden"
          onChange={handleImageUpload}
        />
      )}
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={MODULES[preset]}
        placeholder={placeholder}
        className="rich-text-field__quill"
        style={{ '--ql-editor-min-height': `${minHeight}px` } as React.CSSProperties}
      />
    </div>
  );
}

import { useRef, useCallback, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import { uploadImage } from '../api/upload';
import 'react-quill-new/dist/quill.snow.css';
import './BlogRichEditor.css';

const labelClass = 'block text-sm font-medium text-gray-600 mb-1';

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['blockquote'],
    [{ color: [] }, { background: [] }],
    ['clean'],
  ],
};

interface BlogRichEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function BlogRichEditor({ value, onChange }: BlogRichEditorProps) {
  const quillRef = useRef<ReactQuill>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertImage = useCallback((url: string) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const range = quill.getSelection(true) ?? { index: quill.getLength(), length: 0 };
    quill.insertEmbed(range.index, 'image', url);
    quill.setSelection(range.index + 1);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;
      const toolbar = quill.getModule('toolbar') as { addHandler: (name: string, fn: () => void) => void };
      toolbar?.addHandler('image', () => fileInputRef.current?.click());
    }, 0);
    return () => clearTimeout(id);
  }, []);

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
    <div className="blog-rich-editor">
      <span className={labelClass}>Article content</span>
      <p className="text-xs text-gray-500 mb-1">
        Write your post below. Use the toolbar for formatting. Click the image icon or paste an image to upload.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
        className="hidden"
        onChange={handleImageUpload}
      />
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={MODULES}
        placeholder="Write your article..."
        className="blog-rich-editor__quill"
      />
    </div>
  );
}

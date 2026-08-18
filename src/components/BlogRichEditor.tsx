import { RichTextField } from './RichTextField';

interface BlogRichEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function BlogRichEditor({ value, onChange }: BlogRichEditorProps) {
  return (
    <RichTextField
      label="Article content"
      hint="Write your post below. Use the toolbar for formatting. Click the image icon or paste an image to upload."
      value={value}
      onChange={onChange}
      placeholder="Write your article..."
      preset="article"
    />
  );
}

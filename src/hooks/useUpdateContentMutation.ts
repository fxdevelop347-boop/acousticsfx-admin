import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateContent } from '../api/content';

export function useUpdateContentMutation() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      key,
      value,
      type,
    }: {
      key: string;
      value: string;
      type?: 'text' | 'image' | 'video';
    }) => updateContent(key, { value, type }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin', 'content'] });
    },
  });
}

interface MessageContentProps {
  content: string;
  messageId: string;
}

export function MessageContent({ content }: MessageContentProps) {
  // Parse markdown-like content and detect claims
  const parseContent = (text: string) => {
    // Simple markdown parsing
    const parsed = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(
        /`(.*?)`/g,
        '<code class="bg-surface-100 dark:bg-surface-800 px-1 rounded">$1</code>'
      )
      .replace(/\n/g, '<br />');

    return parsed;
  };

  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: parseContent(content) }}
    />
  );
}

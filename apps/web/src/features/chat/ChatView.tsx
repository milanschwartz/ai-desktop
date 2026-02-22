import { useState, useRef, useEffect } from 'react';
import { useMessages, useSendMessage } from '../../hooks/useApi';
import { MessageContent } from './MessageContent';
import type { Message } from '@ai-desktop/shared';

interface ChatViewProps {
  workspaceId: string;
  channelId: string;
}

export function ChatView({ channelId }: ChatViewProps) {
  const { data: messages, isLoading } = useMessages(channelId);
  const sendMessage = useSendMessage();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const content = input.trim();
    setInput('');

    await sendMessage.mutateAsync({ channelId, content });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((message: Message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.authorType === 'user' ? 'justify-end' : ''}`}
          >
            {message.authorType === 'agent' && (
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-sm flex-shrink-0">
                🤖
              </div>
            )}
            <div
              className={`max-w-[70%] ${message.authorType === 'user' ? 'bg-primary-600 text-white' : 'card'} rounded-lg p-3`}
            >
              <MessageContent content={message.content} messageId={message.id} />
              <div
                className={`text-xs mt-1 ${message.authorType === 'user' ? 'text-primary-200' : 'text-surface-500'}`}
              >
                {new Date(message.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-4 border-t border-surface-200 dark:border-surface-800"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={!input.trim() || sendMessage.isPending}
            className="btn-primary"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

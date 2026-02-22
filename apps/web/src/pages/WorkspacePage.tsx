import { useParams } from 'react-router-dom';
import { ChatView } from '../features/chat/ChatView';
import { CanvasView } from '../features/canvas/CanvasView';

interface WorkspacePageProps {
  viewMode?: 'structured' | 'canvas';
}

export function WorkspacePage({ viewMode = 'structured' }: WorkspacePageProps) {
  const { workspaceId, channelId } = useParams();

  if (viewMode === 'canvas' || !channelId) {
    return <CanvasView workspaceId={workspaceId!} />;
  }

  return <ChatView workspaceId={workspaceId!} channelId={channelId} />;
}

import { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useCanvas } from '../../hooks/useApi';

interface CanvasViewProps {
  workspaceId: string;
}

export function CanvasView({ workspaceId }: CanvasViewProps) {
  const { data: canvasData, isLoading } = useCanvas(workspaceId);

  const initialNodes: Node[] =
    canvasData?.nodes?.map((n) => ({
      id: n.id,
      type: 'default',
      data: { label: n.title },
      position: { x: n.positionX, y: n.positionY },
      style: {
        width: n.width,
        height: n.height,
        backgroundColor: n.style?.color || '#fff',
        borderRadius: n.style?.shape === 'rounded' ? 12 : n.style?.shape === 'circle' ? '50%' : 4,
      },
    })) || [];

  const initialEdges: Edge[] =
    canvasData?.edges?.map((e) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      label: e.label,
    })) || [];

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

import React, { useCallback, useState } from 'react';
import { Controls, Background, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { DialogNode, Response } from '../types';

interface DialogGraphProps {
  nodes: DialogNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onUpdateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  onCreateConnection: (sourceNodeId: string, targetNodeId: string, responseId: string) => void;
  onNodeMouseDown?: (nodeId: string, event: React.MouseEvent) => void;
}

const CustomNode: React.FC<{ 
  data: { 
    label: string; 
    text: string; 
    node: DialogNode;
    onResponseDragStart?: (response: Response, event: React.MouseEvent) => void;
  };
  selected?: boolean;
}> = ({ data, selected }) => {
  const hasRequirement = data.node.responses.some(r => r.requirement);
  
  return (
    <div className={`custom-node ${hasRequirement ? 'has-requirement' : ''} ${selected ? 'selected' : ''}`}>
      <div className="custom-node-header">{data.label}</div>
      <div className="custom-node-content">
        <p>{data.text.substring(0, 100)}{data.text.length > 100 ? '...' : ''}</p>
        {data.node.responses.length > 0 && (
          <div className="responses-list">
            {data.node.responses.map((response, index) => (
              <div 
                key={response.id} 
                className="response-item-graph"
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  if (data.onResponseDragStart) {
                    data.onResponseDragStart(response, e);
                  }
                }}
                title="Перетащите для создания связи"
              >
                <span className="response-index">{index + 1}.</span>
                <span className="response-text">{response.text}</span>
                {response.nextNodeId && (
                  <span className="response-target">→ {response.nextNodeId.substring(0, 8)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const DialogGraphInner: React.FC<DialogGraphProps> = ({
  nodes: dialogNodes,
  selectedNodeId,
  onSelectNode,
  onCreateConnection,
  onNodeMouseDown,
}) => {
  const [draggedResponse, setDraggedResponse] = useState<{ response: Response; sourceNodeId: string } | null>(null);

  const rfNodes = dialogNodes.map(node => ({
    id: node.id,
    position: node.position || { x: 0, y: 0 },
    data: {
      label: node.title,
      text: node.text,
      node,
      onResponseDragStart: (response: Response, _event: React.MouseEvent) => {
        setDraggedResponse({ response, sourceNodeId: node.id });
      }
    },
    draggable: true
  }));

  const edges: Array<{ id: string; source: string; target: string; label?: string }> = [];
  dialogNodes.forEach(node => {
    node.responses.forEach(response => {
      if (response.nextNodeId) {
        edges.push({
          id: `${node.id}-${response.id}`,
          source: node.id,
          target: response.nextNodeId,
          label: response.requirement 
            ? `${response.text} (<${response.requirement.characteristic}: ${response.requirement.value}>)`
            : response.text
        });
      }
    });
  });

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (draggedResponse) {
      // Получаем координаты мыши относительно контейнера
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Находим узел, на который dropped
      const targetNode = dialogNodes.find(node => {
        const nodeX = node.position?.x || 0;
        const nodeY = node.position?.y || 0;
        return x >= nodeX && x <= nodeX + 280 && y >= nodeY && y <= nodeY + 200;
      });
      
      if (targetNode && targetNode.id !== draggedResponse.sourceNodeId) {
        onCreateConnection(draggedResponse.sourceNodeId, targetNode.id, draggedResponse.response.id);
      }
      setDraggedResponse(null);
    }
  }, [draggedResponse, dialogNodes, onCreateConnection]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  return (
    <div 
      className="dialog-graph" 
      style={{ height: '100%', width: '100%' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="graph-canvas">
        {rfNodes.map(n => (
          <div
            key={n.id}
            className={`graph-node ${n.id === selectedNodeId ? 'selected' : ''}`}
            style={{
              left: n.position.x,
              top: n.position.y,
              position: 'absolute'
            }}
            onClick={() => onSelectNode(n.id)}
            onMouseDown={(e) => {
              if (onNodeMouseDown) {
                onNodeMouseDown(n.id, e);
              }
            }}
          >
            <CustomNode data={n.data as any} selected={n.id === selectedNodeId} />
          </div>
        ))}
        
        <svg className="graph-edges" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {edges.map(edge => {
            const sourceNode = dialogNodes.find(n => n.id === edge.source);
            const targetNode = dialogNodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;
            
            const startX = (sourceNode.position?.x || 0) + 280;
            const startY = (sourceNode.position?.y || 0) + 50;
            const endX = targetNode.position?.x || 0;
            const endY = targetNode.position?.y || 0;
            
            const labelStr = edge.label || '';
            
            return (
              <g key={edge.id}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="#4a90d9"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                {labelStr && (
                  <text
                    x={(startX + endX) / 2}
                    y={(startY + endY) / 2 - 5}
                    fontSize="11"
                    fill="#333"
                    textAnchor="middle"
                  >
                    {labelStr.length > 30 ? labelStr.substring(0, 30) + '...' : labelStr}
                  </text>
                )}
              </g>
            );
          })}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#4a90d9" />
            </marker>
          </defs>
        </svg>
      </div>
      <Controls />
      <Background />
    </div>
  );
};

export const DialogGraph: React.FC<DialogGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <DialogGraphInner {...props} />
    </ReactFlowProvider>
  );
};

// Custom hook for node dragging
export const useNodeDrag = (
  nodes: DialogNode[],
  onUpdatePosition: (nodeId: string, position: { x: number; y: number }) => void
) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((nodeId: string, event: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    setDragOffset({
      x: event.clientX - (node.position?.x || 0),
      y: event.clientY - (node.position?.y || 0)
    });
  }, [nodes]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !draggedNodeId) return;
    
    onUpdatePosition(draggedNodeId, {
      x: event.clientX - dragOffset.x,
      y: event.clientY - dragOffset.y
    });
  }, [isDragging, draggedNodeId, dragOffset, onUpdatePosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedNodeId(null);
  }, []);

  return { isDragging, draggedNodeId, handleMouseDown, handleMouseMove, handleMouseUp };
};

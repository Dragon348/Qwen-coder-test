import React from 'react';
import { Controls, Background, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { DialogNode } from '../types';

interface DialogGraphProps {
  nodes: DialogNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  
}

const CustomNode: React.FC<{ data: { label: string; text: string; node: DialogNode } }> = ({ data }) => {
  const hasRequirement = data.node.responses.some(r => r.requirement);
  
  return (
    <div className={`custom-node ${hasRequirement ? 'has-requirement' : ''}`}>
      <div className="custom-node-header">{data.label}</div>
      <div className="custom-node-content">
        <p>{data.text.substring(0, 100)}{data.text.length > 100 ? '...' : ''}</p>
        {data.node.responses.length > 0 && (
          <div className="response-count">
            Ответов: {data.node.responses.length}
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
}) => {
  const rfNodes = dialogNodes.map(node => ({
    id: node.id,
    position: node.position || { x: 0, y: 0 },
    data: {
      label: node.title,
      text: node.text,
      node
    }
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

  return (
    <div className="dialog-graph" style={{ height: '100%', width: '100%' }}>
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
          >
            <CustomNode data={n.data as any} />
          </div>
        ))}
        
        <svg className="graph-edges" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {edges.map(edge => {
            const sourceNode = dialogNodes.find(n => n.id === edge.source);
            const targetNode = dialogNodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;
            
            const startX = (sourceNode.position?.x || 0) + 150;
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

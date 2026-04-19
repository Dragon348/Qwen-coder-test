import React, { useCallback, useState } from 'react';
import { Background, ReactFlowProvider, useViewport } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { DialogNode, Response } from '../types';

interface DialogGraphProps {
  nodes: DialogNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onUpdateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  onCreateConnection: (sourceNodeId: string, targetNodeId: string, responseId: string) => void;
  onNodeMouseDown?: (nodeId: string, event: React.MouseEvent) => void;
  onEditNodeInPlace?: (nodeId: string, field: 'title' | 'text' | 'response', responseId?: string) => void;
  onAddResponseInPlace?: (nodeId: string) => void;
}

// Интерфейс данных для кастомного узла
interface CustomNodeData {
  label: string;
  text: string;
  node: DialogNode;
  onResponseDragStart?: (response: Response, event: React.MouseEvent) => void;
  onEditField?: (field: 'title' | 'text' | 'response', responseId?: string) => void;
  onEditInPlace?: (field: 'title' | 'text' | 'response', responseId?: string) => void;
  onAddResponse?: () => void;
}

const CustomNode: React.FC<{ 
  data: CustomNodeData;
  selected?: boolean;
}> = ({ data, selected }) => {
  const hasRequirement = data.node.responses.some(r => r.requirement);
  
  return (
    <div className={`custom-node ${hasRequirement ? 'has-requirement' : ''} ${selected ? 'selected' : ''}`}>
      {/* Верхняя панель с заголовком и кнопками действий */}
      <div className="custom-node-header-row">
        {/* Аватарка узла */}
        <div className="node-avatar">
          🎭
        </div>
        {/* Клик по заголовку открывает редактирование заголовка */}
        <div 
          className="custom-node-header-title"
          onClick={(e) => {
            e.stopPropagation();
            if (data.onEditInPlace) {
              data.onEditInPlace('title');
            }
          }}
          title="Кликните для редактирования заголовка"
          style={{ cursor: 'pointer', flex: 1 }}
        >
          {data.label}
        </div>
        <div className="custom-node-actions">
          <button
            className="node-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (data.onAddResponse) {
                data.onAddResponse();
              }
            }}
            title="Добавить ответ"
          >
            +
          </button>
        </div>
      </div>
      <div className="custom-node-content">
        {/* Клик по тексту открывает редактирование текста */}
        <p 
          onClick={(e) => {
            e.stopPropagation();
            if (data.onEditInPlace) {
              data.onEditInPlace('text');
            }
          }}
          title="Кликните для редактирования текста"
          style={{ cursor: 'pointer' }}
        >
          {data.text.substring(0, 100)}{data.text.length > 100 ? '...' : ''}
        </p>
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
                onClick={(e) => {
                  e.stopPropagation();
                  if (data.onEditInPlace) {
                    data.onEditInPlace('response', response.id);
                  }
                }}
                title="Перетащите для создания связи или кликните для редактирования"
                style={{ cursor: 'pointer' }}
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
  onEditNodeInPlace,
  onAddResponseInPlace,
}) => {
  // Состояние для отслеживания перетаскиваемого ответа при создании соединения
  const [draggedResponse, setDraggedResponse] = useState<{ response: Response; sourceNodeId: string } | null>(null);
  
  // Получаем доступ к трансформации (масштаб и панорамирование) из React Flow
  const viewport = useViewport();

  // Преобразование узлов диалога в узлы React Flow
  const rfNodes = dialogNodes.map(node => ({
    id: node.id,
    position: node.position || { x: 0, y: 0 },
    data: {
      label: node.title,
      text: node.text,
      node,
      onResponseDragStart: (response: Response) => {
        setDraggedResponse({ response, sourceNodeId: node.id });
      },
      onEditField: (field: 'title' | 'text' | 'response', responseId?: string) => {
        // При клике на поле редактирования выбираем узел и передаем фокус на соответствующее поле
        onSelectNode(node.id);
        // Передаём событие через CustomEvent для обработки в NodeEditor
        const event = new CustomEvent('dialog-focus-field', { 
          detail: { nodeId: node.id, field, responseId } 
        });
        window.dispatchEvent(event);
      },
      onEditInPlace: (field: 'title' | 'text' | 'response', responseId?: string) => {
        // Обработка редактирования прямо в узле
        if (onEditNodeInPlace) {
          onEditNodeInPlace(node.id, field, responseId);
        }
      },
      onAddResponse: () => {
        // Обработка добавления ответа прямо в узле
        if (onAddResponseInPlace) {
          onAddResponseInPlace(node.id);
        }
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
      // Получаем текущую трансформацию для учёта масштаба и панорамирования
      const zoom = viewport.zoom || 1;
      const panX = viewport.x || 0;
      const panY = viewport.y || 0;
      
      // Получаем координаты мыши относительно контейнера с учётом масштаба
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      // Координаты внутри SVG-контейнера с учётом трансформации
      const x = (event.clientX - rect.left - panX) / zoom;
      const y = (event.clientY - rect.top - panY) / zoom;
      
      // Находим узел, на который dropped
      // Размеры узла: 280x200 пикселей
      const targetNode = dialogNodes.find(node => {
        const nodeX = node.position?.x || 0;
        const nodeY = node.position?.y || 0;
        return x >= nodeX && x <= nodeX + 280 && y >= nodeY && y <= nodeY + 200;
      });
      
      // Проверка: не создаём соединение с самим собой и проверяем отсутствие дубликата
      if (targetNode && targetNode.id !== draggedResponse.sourceNodeId) {
        const sourceNode = dialogNodes.find(n => n.id === draggedResponse.sourceNodeId);
        const alreadyExists = sourceNode?.responses.some(
          r => r.id === draggedResponse.response.id && r.nextNodeId === targetNode.id
        );
        
        if (!alreadyExists) {
          onCreateConnection(draggedResponse.sourceNodeId, targetNode.id, draggedResponse.response.id);
        }
      }
      setDraggedResponse(null);
    }
  }, [draggedResponse, dialogNodes, onCreateConnection, viewport]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  // Вычисляем размеры холста для правильного отображения стрелок
  const canvasBounds = dialogNodes.reduce((bounds, node) => {
    const x = node.position?.x || 0;
    const y = node.position?.y || 0;
    return {
      minX: Math.min(bounds.minX, x),
      minY: Math.min(bounds.minY, y),
      maxX: Math.max(bounds.maxX, x + 280),
      maxY: Math.max(bounds.maxY, y + 200)
    };
  }, { minX: 0, minY: 0, maxX: 800, maxY: 600 });
  
  const canvasWidth = Math.max(canvasBounds.maxX - canvasBounds.minX + 100, 800);
  const canvasHeight = Math.max(canvasBounds.maxY - canvasBounds.minY + 100, 600);

  return (
    <div 
      className="dialog-graph" 
      style={{ height: '100%', width: '100%' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="graph-canvas" style={{ width: canvasWidth, height: canvasHeight }}>
        {rfNodes.map(n => (
          <div
            key={n.id}
            className={`graph-node ${n.id === selectedNodeId ? 'selected' : ''}`}
            style={{
              left: n.position.x - canvasBounds.minX + 50,
              top: n.position.y - canvasBounds.minY + 50,
              position: 'absolute'
            }}
            onClick={() => onSelectNode(n.id)}
            onMouseDown={(e) => {
              if (onNodeMouseDown) {
                onNodeMouseDown(n.id, e);
              }
            }}
          >
            <CustomNode data={n.data} selected={n.id === selectedNodeId} />
          </div>
        ))}
        
        <svg className="graph-edges" style={{ position: 'absolute', top: 0, left: 0, width: canvasWidth, height: canvasHeight, pointerEvents: 'none' }}>
          {edges.map(edge => {
            const sourceNode = dialogNodes.find(n => n.id === edge.source);
            const targetNode = dialogNodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;
            
            // Вычисляем координаты для начала и конца стрелки с учётом смещения холста
            // Начало: правая сторона исходного узла (середина по высоте)
            const startX = (sourceNode.position?.x || 0) - canvasBounds.minX + 50 + 280;
            const startY = (sourceNode.position?.y || 0) - canvasBounds.minY + 50 + 50;
            // Конец: левая сторона целевого узла (середина по высоте)
            const endX = (targetNode.position?.x || 0) - canvasBounds.minX + 50;
            const endY = (targetNode.position?.y || 0) - canvasBounds.minY + 50;
            
            const labelStr = edge.label || '';
            
            // Вычисляем контрольные точки для кривой Безье
            // Это позволяет создать плавную кривую, которая обходит блоки
            const dx = Math.abs(endX - startX);
            
            // Контрольные точки для кривой Безье
            // Первая контрольная точка смещена вправо от начальной точки
            const cp1x = startX + Math.max(50, dx * 0.5);
            const cp1y = startY;
            // Вторая контрольная точка смещена влево от конечной точки
            const cp2x = endX - Math.max(50, dx * 0.5);
            const cp2y = endY;
            
            // Создаём путь кривой Безье
            const pathD = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
            
            // Вычисляем точку для размещения метки (посередине кривой)
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            
            return (
              <g key={edge.id}>
                {/* Кривая Безье вместо прямой линии */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#4a90d9"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                {labelStr && (
                  <text
                    x={midX}
                    y={midY - 5}
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

// Стили для кнопок действий в узле
const style = document.createElement('style');
style.textContent = `
  .custom-node-header-row {
    display: flex;
    align-items: center;
    background: linear-gradient(135deg, #89b4fa, #b4befe);
    padding: 8px 12px;
    gap: 8px;
  }
  .node-avatar {
    font-size: 18px;
    line-height: 1;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .custom-node-header-title {
    color: #1e1e2e;
    font-weight: 600;
    font-size: 14px;
    flex: 1;
  }
  .custom-node-actions {
    display: flex;
    gap: 4px;
  }
  .node-action-btn {
    background: rgba(255, 255, 255, 0.3);
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
  }
  .node-action-btn:hover {
    background: rgba(255, 255, 255, 0.5);
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('dialog-graph-inline-styles')) {
  style.id = 'dialog-graph-inline-styles';
  document.head.appendChild(style);
}

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDialogStore } from './hooks/useDialogStore'
import { Toolbar } from './components/Toolbar'
import { NodeEditor } from './components/NodeEditor'
import { DialogGraph } from './components/DialogGraph'
import './App.css'

function App() {
  const {
    nodes,
    projectName,
    setProjectName,
    selectedNodeId,
    setSelectedNodeId,
    addNode,
    updateNode,
    deleteNode,
    addResponse,
    updateResponse,
    deleteResponse,
    exportToJson,
    importFromJson,
    validate,
    updateNodePosition
  } = useDialogStore();
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const graphAreaRef = useRef<HTMLDivElement>(null);

  // Handle node drag start
  const handleNodeMouseDown = useCallback((nodeId: string, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('.response-item-graph')) return;
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    // Вычисляем смещение с учётом масштаба и панорамирования
    const graphRect = graphAreaRef.current?.getBoundingClientRect();
    const offsetX = graphRect ? (event.clientX - graphRect.left - pan.x) / scale : 0;
    const offsetY = graphRect ? (event.clientY - graphRect.top - pan.y) / scale : 0;
    setDragOffset({
      x: offsetX - (node.position?.x || 0),
      y: offsetY - (node.position?.y || 0)
    });
  }, [nodes, pan, scale]);

  // Handle node drag move
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging && draggedNodeId) {
      // Вычисляем новые координаты с учётом масштаба и панорамирования
      const graphRect = graphAreaRef.current?.getBoundingClientRect();
      if (graphRect) {
        const mouseX = (event.clientX - graphRect.left - pan.x) / scale;
        const mouseY = (event.clientY - graphRect.top - pan.y) / scale;
        updateNodePosition(draggedNodeId, {
          x: mouseX - dragOffset.x,
          y: mouseY - dragOffset.y
        });
      }
    } else if (isPanning) {
      setPan({
        x: event.clientX - panStart.x,
        y: event.clientY - panStart.y
      });
    }
  }, [isDragging, draggedNodeId, dragOffset, isPanning, panStart, pan, scale, updateNodePosition]);

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedNodeId(null);
    setIsPanning(false);
  }, []);

  // Handle canvas pan start
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('.graph-node')) return;
    setIsPanning(true);
    setPanStart({
      x: event.clientX - pan.x,
      y: event.clientY - pan.y
    });
  }, [pan]);

  // Handle zoom with focal point
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const graphRect = graphAreaRef.current?.getBoundingClientRect();
    if (!graphRect) return;
    
    const mouseX = event.clientX - graphRect.left;
    const mouseY = event.clientY - graphRect.top;
    
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.5), 2);
    
    // Корректируем панорамирование для зума в точку курсора
    const scaleFactor = newScale / scale;
    const newPanX = mouseX - (mouseX - pan.x) * scaleFactor;
    const newPanY = mouseY - (mouseY - pan.y) * scaleFactor;
    
    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  }, [scale, pan]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleAddNode = () => {
    // Добавляем узел в видимой области с учётом панорамирования и масштаба
    const graphRect = graphAreaRef.current?.getBoundingClientRect();
    const centerX = graphRect ? (graphRect.width / 2 - pan.x) / scale : 100;
    const centerY = graphRect ? (graphRect.height / 2 - pan.y) / scale : 100;
    addNode({ 
      x: centerX + Math.random() * 100 - 50, 
      y: centerY + Math.random() * 100 - 50 
    });
  };

  const handleValidate = () => {
    const result = validate();
    setValidationErrors(result.errors);
    setValidationWarnings(result.warnings);
  };

  const handleImport = (jsonString: string) => {
    const success = importFromJson(jsonString);
    if (success) {
      setValidationErrors([]);
      setValidationWarnings([]);
      alert('Проект успешно импортирован!');
    } else {
      alert('Ошибка импорта проекта. Проверьте формат JSON.');
    }
  };

  const handleCreateConnection = (sourceNodeId: string, targetNodeId: string, responseId: string) => {
    updateResponse(sourceNodeId, responseId, { nextNodeId: targetNodeId });
  };

  // Обработчик редактирования прямо в узле - открывает панель редактора и фокусирует нужное поле
  const handleEditNodeInPlace = useCallback((nodeId: string, field: 'title' | 'text' | 'response', responseId?: string) => {
    setSelectedNodeId(nodeId);
    // Передаём событие через CustomEvent для обработки в NodeEditor
    const event = new CustomEvent('dialog-focus-field', { 
      detail: { nodeId, field, responseId } 
    });
    window.dispatchEvent(event);
  }, [setSelectedNodeId]);

  // Обработчик добавления ответа прямо из узла
  const handleAddResponseInPlace = useCallback((nodeId: string) => {
    addResponse(nodeId);
    setSelectedNodeId(nodeId);
    // Фокус на новом ответе
    setTimeout(() => {
      const event = new CustomEvent('dialog-focus-field', { 
        detail: { nodeId, field: 'response' as const } 
      });
      window.dispatchEvent(event);
    }, 100);
  }, [addResponse, setSelectedNodeId]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  return (
    <div className="app">
      <Toolbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onAddNode={handleAddNode}
        onExport={exportToJson}
        onImport={handleImport}
        onValidate={handleValidate}
        validationErrors={validationErrors}
        validationWarnings={validationWarnings}
        scale={scale}
        onZoomIn={() => setScale(prev => Math.min(prev * 1.2, 2))}
        onZoomOut={() => setScale(prev => Math.max(prev * 0.8, 0.5))}
        onResetView={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
      />

      <div className="main-content">
        <div 
          className="graph-area"
          ref={graphAreaRef}
          onMouseDown={handleCanvasMouseDown}
          onWheel={(e) => handleWheel(e.nativeEvent)}
          style={{ overflow: 'hidden' }}
        >
          <div 
            className="graph-container"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%'
            }}
          >
            <DialogGraph
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onUpdateNodePosition={updateNodePosition}
              onCreateConnection={handleCreateConnection}
              onNodeMouseDown={handleNodeMouseDown}
              onEditNodeInPlace={handleEditNodeInPlace}
              onAddResponseInPlace={handleAddResponseInPlace}
            />
          </div>
        </div>

        {selectedNode && (
          <div className="editor-panel">
            <NodeEditor
              node={selectedNode}
              allNodes={nodes}
              onUpdateNode={updateNode}
              onAddResponse={addResponse}
              onUpdateResponse={updateResponse}
              onDeleteResponse={deleteResponse}
              onDeleteNode={deleteNode}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App

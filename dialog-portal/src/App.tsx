import { useState, useEffect, useCallback } from 'react'
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

  // Handle node drag start
  const handleNodeMouseDown = useCallback((nodeId: string, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('.response-item-graph')) return;
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    setDragOffset({
      x: event.clientX - (node.position?.x || 0),
      y: event.clientY - (node.position?.y || 0)
    });
  }, [nodes]);

  // Handle node drag move
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging && draggedNodeId) {
      updateNodePosition(draggedNodeId, {
        x: (event.clientX - dragOffset.x) / scale,
        y: (event.clientY - dragOffset.y) / scale
      });
    } else if (isPanning) {
      setPan({
        x: event.clientX - panStart.x,
        y: event.clientY - panStart.y
      });
    }
  }, [isDragging, draggedNodeId, dragOffset, isPanning, panStart, scale, updateNodePosition]);

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

  // Handle zoom
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.5), 2));
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleAddNode = () => {
    addNode({ 
      x: (100 + Math.random() * 200 - pan.x) / scale, 
      y: (100 + Math.random() * 200 - pan.y) / scale 
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

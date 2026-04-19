import { useState, useEffect, useCallback, useRef } from 'react'
import { useDialogStore } from './hooks/useDialogStore'
import { Toolbar } from './components/Toolbar'
import { NodeEditor } from './components/NodeEditor'
import { DialogGraph } from './components/DialogGraph'
import './App.css'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _CURRENT_PROJECT_ID_KEY_UNUSED = 'dialog-portal-current-project-id';

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
    updateNodePosition,
    saveProject,
    projectAvatar,
    setProjectAvatar
  } = useDialogStore();
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const graphAreaRef = useRef<HTMLDivElement>(null);
  
  // Состояние для панорамирования и масштабирования
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Handle node drag start
  const handleNodeMouseDown = useCallback((nodeId: string, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('.response-item-graph')) return;
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const graphRect = graphAreaRef.current?.getBoundingClientRect();
    if (!graphRect) return;

    // Вычисляем позицию мыши в координатах графа с учетом масштаба и панорамирования
    const mouseX = (event.clientX - graphRect.left - pan.x) / scale;
    const mouseY = (event.clientY - graphRect.top - pan.y) / scale;
    
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    // Сохраняем смещение относительно позиции узла в координатах графа
    setDragOffset({
      x: mouseX - (node.position?.x || 0),
      y: mouseY - (node.position?.y || 0)
    });
  }, [nodes, pan, scale]);

  // Handle node drag move
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging && draggedNodeId) {
      const graphRect = graphAreaRef.current?.getBoundingClientRect();
      if (graphRect) {
        // Учитываем масштаб при перетаскивании
        const mouseX = (event.clientX - graphRect.left - pan.x) / scale;
        const mouseY = (event.clientY - graphRect.top - pan.y) / scale;
        updateNodePosition(draggedNodeId, {
          x: mouseX - dragOffset.x,
          y: mouseY - dragOffset.y
        });
      }
    }
  }, [isDragging, draggedNodeId, dragOffset, updateNodePosition, pan, scale]);

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedNodeId(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Обработчики для панорамирования (перетаскивание фона)
  const handleGraphAreaMouseDown = useCallback((event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('.graph-node')) return;
    setIsPanning(true);
    panStart.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
  }, [pan]);

  const handleGraphAreaMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: event.clientX - panStart.current.x,
      y: event.clientY - panStart.current.y
    });
  }, [isPanning]);

  const handleGraphAreaMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Обработчик масштабирования колёсиком мыши
  const handleWheel = useCallback((event: WheelEvent) => {
    if (!graphAreaRef.current) return;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      setScale(prev => Math.min(Math.max(prev * delta, 0.2), 3));
    }
  }, []);

  useEffect(() => {
    const graphArea = graphAreaRef.current;
    if (!graphArea) return;
    graphArea.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      graphArea.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Функции управления зумом
  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.2));
  const handleResetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleAddNode = () => {
    // Добавляем узел в центре видимой области
    const graphRect = graphAreaRef.current?.getBoundingClientRect();
    const centerX = graphRect ? graphRect.width / 2 : 100;
    const centerY = graphRect ? graphRect.height / 2 : 100;
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

  // Функция для получения координат с учётом масштаба и панорамирования
  const getGraphCoordinates = useCallback((clientX: number, clientY: number) => {
    const graphRect = graphAreaRef.current?.getBoundingClientRect();
    if (!graphRect) return { x: 0, y: 0 };
    return {
      x: (clientX - graphRect.left - pan.x) / scale,
      y: (clientY - graphRect.top - pan.y) / scale
    };
  }, [pan, scale]);

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

  // Обработчик загрузки аватара проекта
  const handleProjectAvatarUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const avatarData = e.target?.result as string;
      setProjectAvatar(avatarData);
      // Применяем аватар ко всем существующим узлам
      nodes.forEach(node => {
        updateNode(node.id, { avatar: avatarData });
      });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }, [nodes, updateNode, setProjectAvatar]);

  // Обработчик загрузки аватара для отдельного узла
  const handleAvatarUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedNodeId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const avatarData = e.target?.result as string;
      updateNode(selectedNodeId, { avatar: avatarData });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }, [selectedNodeId, updateNode]);

  const handleSave = useCallback(() => {
    saveProject();
    alert(`Проект "${projectName}" сохранён!`);
  }, [projectName, saveProject]);

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
        onSave={handleSave}
        projectAvatar={projectAvatar}
        onProjectAvatarUpload={handleProjectAvatarUpload}
        onGoHome={() => { window.location.href = '/'; }}
      />

      <div className="main-content">
        {/* Скрытый инпут для загрузки аватара */}
        <input
          type="file"
          id="avatar-upload"
          accept="image/*"
          onChange={handleAvatarUpload}
          style={{ display: 'none' }}
        />
        
        <div 
          className="graph-area"
          ref={graphAreaRef}
          style={{ overflow: 'hidden', cursor: isPanning ? 'grabbing' : 'default' }}
          onMouseDown={handleGraphAreaMouseDown}
          onMouseMove={handleGraphAreaMouseMove}
          onMouseUp={handleGraphAreaMouseUp}
          onMouseLeave={handleGraphAreaMouseUp}
        >
          <div 
            className="graph-container"
            style={{
              width: '100%',
              height: '100%',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out'
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
              getGraphCoordinates={getGraphCoordinates}
              scale={scale}
              pan={pan}
            />
          </div>
          
          {/* Панель управления зумом */}
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={handleZoomIn} title="Увеличить">+</button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button className="zoom-btn" onClick={handleZoomOut} title="Уменьшить">−</button>
            <button className="zoom-btn zoom-reset" onClick={handleResetView} title="Сбросить вид">⟲</button>
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
              onAvatarUpload={handleAvatarUpload}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App

import { useState } from 'react'
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

  const handleAddNode = () => {
    addNode({ x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 });
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
      />

      <div className="main-content">
        <div className="graph-area">
          <DialogGraph
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
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

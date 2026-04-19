import React from 'react';

interface ToolbarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onAddNode: () => void;
  onExport: () => string;
  onImport: (jsonString: string) => void;
  onValidate: () => void;
  validationErrors: string[];
  validationWarnings: string[];
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  projectName,
  onProjectNameChange,
  onAddNode,
  onExport,
  onImport,
  onValidate,
  validationErrors,
  validationWarnings,
  scale,
  onZoomIn,
  onZoomOut,
  onResetView
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = onExport();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onImport(content);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <div className="project-name-input">
          <label>Проект:</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            placeholder="Название проекта"
          />
        </div>
        
        <button className="btn-primary" onClick={onAddNode}>
          + Добавить узел
        </button>
        
        <button className="btn-secondary" onClick={onValidate}>
          ✓ Валидация
        </button>
      </div>

      <div className="toolbar-right">
        <div className="zoom-controls">
          <button className="btn-secondary btn-small" onClick={onZoomOut} title="Уменьшить">
            −
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button className="btn-secondary btn-small" onClick={onZoomIn} title="Увеличить">
            +
          </button>
          <button className="btn-secondary btn-small" onClick={onResetView} title="Сбросить вид">
            ⟲
          </button>
        </div>
        
        <button className="btn-secondary" onClick={handleExport}>
          📥 Экспорт JSON
        </button>
        
        <button className="btn-secondary" onClick={handleImportClick}>
          📤 Импорт JSON
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <div className="validation-results">
          {validationErrors.length > 0 && (
            <div className="validation-errors">
              <h4>Ошибки:</h4>
              <ul>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validationWarnings.length > 0 && (
            <div className="validation-warnings">
              <h4>Предупреждения:</h4>
              <ul>
                {validationWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

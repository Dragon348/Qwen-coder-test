import React from 'react';
import type { DialogNode, Response } from '../types';
import { parseRequirement, formatRequirement } from '../types';

interface NodeEditorProps {
  node: DialogNode;
  allNodes: DialogNode[];
  onUpdateNode: (nodeId: string, updates: Partial<DialogNode>) => void;
  onAddResponse: (nodeId: string) => void;
  onUpdateResponse: (nodeId: string, responseId: string, updates: Partial<Response>) => void;
  onDeleteResponse: (nodeId: string, responseId: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({
  node,
  allNodes,
  onUpdateNode,
  onAddResponse,
  onUpdateResponse,
  onDeleteResponse,
  onDeleteNode
}) => {
  const [requirementText, setRequirementText] = React.useState('');

  const handleRequirementSave = (responseId: string) => {
    const requirement = parseRequirement(requirementText);
    if (requirement) {
      onUpdateResponse(node.id, responseId, { requirement });
      setRequirementText('');
    }
  };

  const handleDeleteNode = () => {
    if (window.confirm(`Вы уверены, что хотите удалить узел "${node.title}"? Это действие нельзя отменить.`)) {
      onDeleteNode(node.id);
    }
  };

  return (
    <div className="node-editor">
      <div className="editor-header">
        <h3>Редактирование узла</h3>
        <button 
          className="btn-delete btn-small" 
          onClick={handleDeleteNode}
          title="Удалить узел"
        >
          ✕
        </button>
      </div>

      <div className="form-group">
        <label>Заголовок:</label>
        <input
          type="text"
          value={node.title}
          onChange={(e) => onUpdateNode(node.id, { title: e.target.value })}
          placeholder="Введите заголовок"
        />
      </div>

      <div className="form-group">
        <label>Текст диалога:</label>
        <textarea
          value={node.text}
          onChange={(e) => onUpdateNode(node.id, { text: e.target.value })}
          placeholder="Введите текст диалога"
          rows={4}
        />
      </div>

      <div className="responses-section">
        <h4>Варианты ответов</h4>
        
        {node.responses.map((response, index) => (
          <div key={response.id} className="response-item">
            <div className="response-header">
              <span className="response-number">Ответ #{index + 1}</span>
              <button 
                className="btn-small btn-delete"
                onClick={() => onDeleteResponse(node.id, response.id)}
              >
                Удалить
              </button>
            </div>

            <div className="form-group">
              <label>Текст ответа:</label>
              <input
                type="text"
                value={response.text}
                onChange={(e) => onUpdateResponse(node.id, response.id, { text: e.target.value })}
                placeholder="Введите текст ответа"
              />
            </div>

            <div className="form-group">
              <label>Целевой узел:</label>
              <select
                value={response.nextNodeId || ''}
                onChange={(e) => onUpdateResponse(node.id, response.id, { nextNodeId: e.target.value || undefined })}
              >
                <option value="">-- Не выбрано --</option>
                {allNodes.filter(n => n.id !== node.id).map(n => (
                  <option key={n.id} value={n.id}>{n.title}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Требование (формат: &lt;Характеристика: Значение&gt;):</label>
              <div className="requirement-input">
                <input
                  type="text"
                  value={requirementText}
                  onChange={(e) => setRequirementText(e.target.value)}
                  placeholder="<Сила: 10>"
                />
                <button 
                  className="btn-small"
                  onClick={() => handleRequirementSave(response.id)}
                >
                  Применить
                </button>
              </div>
              {response.requirement && (
                <div className="current-requirement">
                  Текущее требование: <strong>{formatRequirement(response.requirement)}</strong>
                  <button 
                    className="btn-small btn-delete"
                    onClick={() => onUpdateResponse(node.id, response.id, { requirement: undefined })}
                  >
                    Сбросить
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        <button 
          className="btn-add"
          onClick={() => onAddResponse(node.id)}
        >
          + Добавить ответ
        </button>
      </div>
    </div>
  );
};

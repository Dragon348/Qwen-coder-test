import { useState, useCallback, useEffect } from 'react';
import type { DialogNode, Response, DialogProject, DialogProjectExport } from '../types';
import { generateId } from '../types';

const STORAGE_KEY = 'dialog-portal-project';

// Инициализация состояния из localStorage
const getInitialState = (): { nodes: DialogNode[]; projectName: string } => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data: DialogProject = JSON.parse(saved);
      return {
        nodes: data.nodes || [],
        projectName: data.name || 'Новый проект'
      };
    }
  } catch (e) {
    console.error('Failed to load project from localStorage:', e);
  }
  return { nodes: [], projectName: 'Новый проект' };
};

export const useDialogStore = () => {
  const initialState = getInitialState();
  const [nodes, setNodes] = useState<DialogNode[]>(initialState.nodes);
  const [projectName, setProjectName] = useState<string>(initialState.projectName);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    const project: DialogProject = {
      id: generateId(),
      name: projectName,
      nodes,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [nodes, projectName]);

  const addNode = useCallback((position?: { x: number; y: number }) => {
    const newNode: DialogNode = {
      id: generateId(),
      title: 'Новый узел',
      text: 'Введите текст диалога...',
      responses: [],
      position: position || { x: 100, y: 100 }
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    return newNode.id;
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<DialogNode>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => {
      const updatedNodes = prev.map(node => ({
        ...node,
        responses: node.responses.filter(r => r.nextNodeId !== nodeId)
      }));
      return updatedNodes.filter(node => node.id !== nodeId);
    });
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

  const addResponse = useCallback((nodeId: string) => {
    const newResponse: Response = {
      id: generateId(),
      text: 'Новый ответ',
      nextNodeId: undefined
    };
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, responses: [...node.responses, newResponse] }
        : node
    ));
  }, []);

  const updateResponse = useCallback((nodeId: string, responseId: string, updates: Partial<Response>) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? {
            ...node,
            responses: node.responses.map(r =>
              r.id === responseId ? { ...r, ...updates } : r
            )
          }
        : node
    ));
  }, []);

  const deleteResponse = useCallback((nodeId: string, responseId: string) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId
        ? { ...node, responses: node.responses.filter(r => r.id !== responseId) }
        : node
    ));
  }, []);

  /**
   * Экспорт проекта в JSON без позиций узлов
   * Позиции хранятся только локально для удобства редактирования
   */
  const exportToJson = useCallback((): string => {
    // Удаляем позиции из узлов перед экспортом с помощью деструктуризации
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const nodesWithoutPosition = nodes.map(({ position, ...rest }) => rest);
    const project: DialogProjectExport = {
      id: generateId(),
      name: projectName,
      nodes: nodesWithoutPosition,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    return JSON.stringify(project, null, 2);
  }, [nodes, projectName]);

  const importFromJson = useCallback((jsonString: string) => {
    try {
      const project: DialogProject = JSON.parse(jsonString);
      setProjectName(project.name || 'Импортированный проект');
      // При импорте добавляем дефолтные позиции, если их нет
      const nodesWithPositions = (project.nodes || []).map((node, index) => ({
        ...node,
        position: node.position || { x: 100 + (index % 5) * 300, y: 100 + Math.floor(index / 5) * 250 }
      }));
      setNodes(nodesWithPositions);
      return true;
    } catch (e) {
      console.error('Failed to import project:', e);
      return false;
    }
  }, []);

  const validate = useCallback(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const nodeIds = new Set(nodes.map(n => n.id));

    nodes.forEach(node => {
      node.responses.forEach(response => {
        if (response.nextNodeId && !nodeIds.has(response.nextNodeId)) {
          errors.push(`Битая ссылка в узле "${node.title}": ответ "${response.text}" ведёт к несуществующему узлу`);
        }
        
        if (!response.nextNodeId) {
          warnings.push(`Узел "${node.title}": ответ "${response.text}" не имеет целевого узла`);
        }
      });

      if (node.responses.length === 0) {
        warnings.push(`Тупик: узел "${node.title}" не имеет вариантов ответов`);
      }
    });

    return { errors, warnings };
  }, [nodes]);

  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodes(prev => prev.map(node =>
      node.id === nodeId ? { ...node, position } : node
    ));
  }, []);

  return {
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
  };
};

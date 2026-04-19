import { useState, useCallback, useEffect } from 'react';
import type { DialogNode, Response, DialogProject, DialogProjectExport } from '../types';
import { generateId } from '../types';

const STORAGE_KEY = 'dialog-portal-project';
const PROJECTS_STORAGE_KEY = 'dialog-portal-projects';
const CURRENT_PROJECT_ID_KEY = 'dialog-portal-current-project-id';

// Загрузка проекта из хранилища проектов по ID
const loadProjectById = (projectId: string): DialogProject | null => {
  try {
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (saved) {
      const projects: DialogProject[] = JSON.parse(saved);
      return projects.find(p => p.id === projectId) || null;
    }
  } catch (e) {
    console.error('Failed to load project by ID:', e);
  }
  return null;
};

// Сохранение проекта в хранилище проектов
const saveProjectToStorage = (project: DialogProject) => {
  try {
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    let projects: DialogProject[] = saved ? JSON.parse(saved) : [];
    
    const existingIndex = projects.findIndex(p => p.id === project.id);
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }
    
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save project to storage:', e);
  }
};

// Инициализация состояния из localStorage
const getInitialState = (): { nodes: DialogNode[]; projectName: string } => {
  // Сначала проверяем, есть ли ID текущего проекта
  const currentProjectId = localStorage.getItem(CURRENT_PROJECT_ID_KEY);
  
  if (currentProjectId) {
    const project = loadProjectById(currentProjectId);
    if (project) {
      return {
        nodes: project.nodes || [],
        projectName: project.name || 'Новый проект'
      };
    }
  }
  
  // Если нет ID или проект не найден, пробуем загрузить старый формат
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
  const [projectId] = useState<string>(() => {
    return localStorage.getItem(CURRENT_PROJECT_ID_KEY) || generateId();
  });
  const [projectAvatar, setProjectAvatar] = useState<string | undefined>(() => {
    const currentProjectId = localStorage.getItem(CURRENT_PROJECT_ID_KEY);
    if (currentProjectId) {
      const project = loadProjectById(currentProjectId);
      return project?.avatar;
    }
    return undefined;
  });

  useEffect(() => {
    const project: DialogProject = {
      id: projectId,
      name: projectName,
      nodes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      avatar: projectAvatar
    };
    // Сохраняем и в старом формате (для обратной совместимости), и в новом хранилище проектов
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    saveProjectToStorage(project);
  }, [nodes, projectName, projectId, projectAvatar]);

  const addNode = useCallback((position?: { x: number; y: number }) => {
    const newNode: DialogNode = {
      id: generateId(),
      title: 'Новый узел',
      text: 'Введите текст диалога...',
      responses: [],
      position: position || { x: 100, y: 100 },
      avatar: projectAvatar // Применяем аватар проекта к новому узлу
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    return newNode.id;
  }, [projectAvatar]);

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
      setProjectAvatar(project.avatar); // Загружаем аватар проекта
      // При импорте добавляем дефолтные позиции, если их нет
      const nodesWithPositions = (project.nodes || []).map((node, index) => ({
        ...node,
        position: node.position || { x: 100 + (index % 5) * 300, y: 100 + Math.floor(index / 5) * 250 },
        avatar: project.avatar || node.avatar // Применяем аватар проекта или узла
      }));
      setNodes(nodesWithPositions);
      return true;
    } catch (e) {
      console.error('Failed to import project:', e);
      return false;
    }
  }, [setProjectAvatar]);

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

  const saveProject = useCallback(() => {
    saveProjectToStorage({
      id: projectId,
      name: projectName,
      nodes,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }, [projectId, projectName, nodes]);

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
    updateNodePosition,
    saveProject,
    projectAvatar,
    setProjectAvatar
  };
};

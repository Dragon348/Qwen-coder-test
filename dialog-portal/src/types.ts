// Типы данных для диалоговой системы

export interface Requirement {
  characteristic: string;
  value: number;
}

export interface Response {
  id: string;
  text: string;
  requirement?: Requirement;
  nextNodeId?: string;
}

export interface DialogNode {
  id: string;
  title: string;
  text: string;
  responses: Response[];
  // Позиция используется только для отображения в редакторе, не экспортируется
  position?: { x: number; y: number };
  avatar?: string; // URL или base64 изображение аватара
}

export interface DialogProject {
  id: string;
  name: string;
  nodes: DialogNode[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Интерфейс для экспорта проекта без позиций узлов
 * Позиции хранятся только локально для удобства редактирования
 */
export interface DialogProjectExport {
  id: string;
  name: string;
  nodes: Omit<DialogNode, 'position'>[];
  createdAt: number;
  updatedAt: number;
}

export const generateId = (): string => {
  // Используем crypto.randomUUID() для более надёжной генерации уникальных ID
  // Это снижает вероятность коллизий по сравнению с Math.random()
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Фолбэк для старых браузеров
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const parseRequirement = (text: string): Requirement | null => {
  const match = text.match(/<([^:]+):\s*(\d+)>/);
  if (match) {
    return {
      characteristic: match[1].trim(),
      value: parseInt(match[2], 10)
    };
  }
  return null;
};

export const formatRequirement = (requirement: Requirement): string => {
  return `<${requirement.characteristic}: ${requirement.value}>`;
};

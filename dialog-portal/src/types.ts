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
  position?: { x: number; y: number };
}

export interface DialogProject {
  id: string;
  name: string;
  nodes: DialogNode[];
  createdAt: number;
  updatedAt: number;
}

export const generateId = (): string => {
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

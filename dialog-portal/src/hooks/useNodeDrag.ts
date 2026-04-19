// Хук для перетаскивания узлов диаграммы
// Вынесен в отдельный файл для соответствия правилам react-refresh

import { useState, useCallback } from 'react';
import type { DialogNode } from '../types';

/**
 * Хук управления перетаскиванием узлов
 * @param nodes - Массив всех узлов диаграммы
 * @param onUpdatePosition - Функция обновления позиции узла
 */
export const useNodeDrag = (
  nodes: DialogNode[],
  onUpdatePosition: (nodeId: string, position: { x: number; y: number }) => void
) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  /**
   * Обработчик начала перетаскивания узла
   */
  const handleMouseDown = useCallback((nodeId: string, event: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    // Вычисляем смещение курсора относительно левого верхнего угла узла
    setDragOffset({
      x: event.clientX - (node.position?.x || 0),
      y: event.clientY - (node.position?.y || 0)
    });
  }, [nodes]);

  /**
   * Обработчик перемещения при перетаскивании
   */
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !draggedNodeId) return;
    
    onUpdatePosition(draggedNodeId, {
      x: event.clientX - dragOffset.x,
      y: event.clientY - dragOffset.y
    });
  }, [isDragging, draggedNodeId, dragOffset, onUpdatePosition]);

  /**
   * Обработчик завершения перетаскивания
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedNodeId(null);
  }, []);

  return { isDragging, draggedNodeId, handleMouseDown, handleMouseMove, handleMouseUp };
};

import React, { useState, useCallback } from 'react';

export interface Project {
  id: string;
  name: string;
  nodes: any[];
  createdAt: number;
  updatedAt: number;
}

const PROJECTS_STORAGE_KEY = 'dialog-portal-projects';

const getStoredProjects = (): Project[] => {
  try {
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load projects from localStorage:', e);
  }
  return [];
};

const saveProjectsToStorage = (projects: Project[]) => {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
};

export const HomePage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(getStoredProjects);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = useCallback(() => {
    if (!newProjectName.trim()) {
      alert('Введите название проекта');
      return;
    }

    const newProject: Project = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name: newProjectName.trim(),
      nodes: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
    setNewProjectName('');
  }, [newProjectName, projects]);

  const handleDeleteProject = useCallback((projectId: string, projectName: string) => {
    if (!window.confirm(`Вы уверены, что хотите удалить проект "${projectName}"? Это действие нельзя отменить.`)) {
      return;
    }

    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
  }, [projects]);

  const handleExportProject = useCallback((project: Project) => {
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleImportProject = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const project: Project = JSON.parse(content);
        
        // Проверяем базовую структуру
        if (!project.id || !project.name || !Array.isArray(project.nodes)) {
          alert('Неверный формат файла проекта');
          return;
        }

        const updatedProjects = [...projects, {
          ...project,
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
          updatedAt: Date.now()
        }];
        
        setProjects(updatedProjects);
        saveProjectsToStorage(updatedProjects);
        alert(`Проект "${project.name}" успешно импортирован!`);
      } catch (err) {
        alert('Ошибка при импорте файла. Убедитесь, что это корректный JSON файл проекта.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [projects]);

  const handleOpenProject = useCallback((projectId: string) => {
    // Сохраняем ID текущего проекта в localStorage для загрузки в редакторе
    localStorage.setItem('dialog-portal-current-project-id', projectId);
    // Перенаправляем на страницу редактора
    window.location.href = '/editor';
  }, []);

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>🎭 Dialog Portal</h1>
        <p className="home-subtitle">Управление проектами диалогов</p>
      </header>

      <main className="home-main">
        {/* Создание нового проекта и импорт */}
        <section className="home-actions-section">
          <div className="create-project-card">
            <h2>✨ Создать новый проект</h2>
            <div className="create-project-form">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Название проекта"
                className="project-name-input"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
              />
              <button 
                className="btn-primary btn-create" 
                onClick={handleCreateProject}
              >
                + Создать
              </button>
            </div>
          </div>
          
          <div className="import-project-card">
            <h2>📤 Импорт проекта</h2>
            <label className="btn-secondary import-label">
              Загрузить из файла
              <input
                type="file"
                accept=".json"
                onChange={handleImportProject}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </section>

        {/* Список проектов */}
        <section className="projects-list-section">
          <h2>📁 Мои проекты <span className="projects-count">({projects.length})</span></h2>
          
          {projects.length === 0 ? (
            <div className="no-projects-message">
              <p>У вас пока нет проектов</p>
              <p className="hint">Создайте новый или импортируйте существующий</p>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map(project => (
                <div key={project.id} className="project-card">
                  <div className="project-card-header">
                    <div className="project-icon">📋</div>
                    <h3>{project.name}</h3>
                  </div>
                  
                  <div className="project-card-info">
                    <div className="project-stat">
                      <span className="stat-value">{project.nodes.length}</span>
                      <span className="stat-label">узлов</span>
                    </div>
                    <div className="project-dates">
                      <p className="project-date">
                        <span className="date-label">Создан:</span> {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                      <p className="project-date">
                        <span className="date-label">Обновлён:</span> {new Date(project.updatedAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="project-card-actions">
                    <button 
                      className="btn-primary btn-open"
                      onClick={() => handleOpenProject(project.id)}
                    >
                      Открыть
                    </button>
                    <button 
                      className="btn-secondary btn-export"
                      onClick={() => handleExportProject(project)}
                    >
                      Экспорт
                    </button>
                    <button 
                      className="btn-delete btn-icon"
                      onClick={() => handleDeleteProject(project.id, project.name)}
                      title="Удалить проект"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

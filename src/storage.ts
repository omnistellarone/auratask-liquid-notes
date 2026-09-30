import type { Todo } from './types';

const STORAGE_KEY = 'liquid_glass_todos_v1';

const DEFAULT_TODOS: Todo[] = [
  {
    id: 'demo-1',
    title: 'Review sleek liquid glass UI design',
    completed: true,
    priority: 'high',
    category: 'Work',
    createdAt: Date.now() - 3600000 * 3,
  },
  {
    id: 'demo-2',
    title: 'Complete TypeScript state architecture',
    completed: false,
    priority: 'high',
    category: 'Work',
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'demo-3',
    title: 'Plan weekly workflow & priority milestones',
    completed: false,
    priority: 'medium',
    category: 'Personal',
    createdAt: Date.now() - 3600000 * 1,
  },
  {
    id: 'demo-4',
    title: 'Afternoon hydration and mindfulness break',
    completed: false,
    priority: 'low',
    category: 'Health',
    createdAt: Date.now(),
  },
];

export function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveTodos(DEFAULT_TODOS);
      return DEFAULT_TODOS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return DEFAULT_TODOS;
  } catch (error) {
    console.error('Failed to load tasks from localStorage:', error);
    return DEFAULT_TODOS;
  }
}

export function saveTodos(todos: Todo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (error) {
    console.error('Failed to save tasks to localStorage:', error);
  }
}

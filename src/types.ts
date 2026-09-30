export type Priority = 'low' | 'medium' | 'high';

export type Category = 'Work' | 'Personal' | 'Study' | 'Health' | 'Urgent' | 'General';

export type FilterStatus = 'all' | 'active' | 'completed';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  category: Category;
  createdAt: number;
}

export interface NoteAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  isImage: boolean;
}

export interface AudioMemo {
  id: string;
  audioDataUrl: string;
  durationSec: number;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  contentHtml: string;
  attachments: NoteAttachment[];
  audioMemos: AudioMemo[];
  createdAt: number;
  updatedAt: number;
}

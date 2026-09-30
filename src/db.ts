import type { Note } from './types';

const DB_NAME = 'AuraTaskNotesDB';
const DB_VERSION = 1;
const STORE_NAME = 'notes';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllNotes(): Promise<Note[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result as Note[];
        if (result.length === 0) {
          const sample = createInitialSampleNote();
          saveNote(sample).then(() => resolve([sample]));
        } else {
          // Sort by updatedAt descending
          result.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(result);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get notes from IndexedDB:', error);
    return [createInitialSampleNote()];
  }
}

export async function saveNote(note: Note): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(note);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteNote(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function createInitialSampleNote(): Note {
  return {
    id: 'welcome-note',
    title: '✨ Welcome to AuraNotes Liquid Workspace',
    contentHtml: `
      <h3>Welcome to your Liquid Glass Rich Workspace!</h3>
      <p>This workspace allows you to capture ideas alongside your tasks with full multimedia support:</p>
      <ul>
        <li><strong>Rich Text Formatting</strong>: Headings, <em>italics</em>, bullet points, and quotes.</li>
        <li><strong>Document & Image Attachments</strong>: Drop PDFs, Word docs, PNGs, and JPEGs.</li>
        <li><strong>Voice Memos</strong>: Click the 🎙️ Record button to capture crystal-clear audio recordings.</li>
      </ul>
      <p>Everything is encrypted and saved directly in your browser's persistent IndexedDB storage.</p>
    `,
    attachments: [],
    audioMemos: [],
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
  };
}

import './style.css';
import type { Todo, Priority, Category, FilterStatus, Note, NoteAttachment, AudioMemo } from './types';
import { loadTodos, saveTodos } from './storage';
import { getAllNotes, saveNote as dbSaveNote, deleteNote as dbDeleteNote } from './db';

/* ==========================================================================
   State Management: Tasks
   ========================================================================== */

let todos: Todo[] = loadTodos();
let currentFilter: FilterStatus = 'all';
let searchQuery: string = '';
let editingId: string | null = null;

/* ==========================================================================
   State Management: Notes & Media
   ========================================================================== */

let notes: Note[] = [];
let activeNote: Note | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingStartTime = 0;
let recordingTimerInterval: number | null = null;

/* ==========================================================================
   DOM Element Selectors: Tasks
   ========================================================================== */

const todoForm = document.getElementById('todo-form') as HTMLFormElement;
const todoInput = document.getElementById('todo-input') as HTMLInputElement;
const prioritySelect = document.getElementById('priority-select') as HTMLSelectElement;
const categorySelect = document.getElementById('category-select') as HTMLSelectElement;
const todoList = document.getElementById('todo-list') as HTMLUListElement;
const emptyState = document.getElementById('empty-state') as HTMLDivElement;

const searchInput = document.getElementById('search-input') as HTMLInputElement;
const clearSearchBtn = document.getElementById('clear-search-btn') as HTMLButtonElement;
const filterTabs = document.querySelectorAll<HTMLButtonElement>('.filter-tab');

const countAllEl = document.getElementById('count-all') as HTMLSpanElement;
const countActiveEl = document.getElementById('count-active') as HTMLSpanElement;
const countCompletedEl = document.getElementById('count-completed') as HTMLSpanElement;

const metricCompletedEl = document.getElementById('metric-completed') as HTMLSpanElement;
const metricPendingEl = document.getElementById('metric-pending') as HTMLSpanElement;
const progressBarEl = document.getElementById('progress-bar') as HTMLDivElement;
const progressPercentageEl = document.getElementById('progress-percentage') as HTMLSpanElement;
const footerSummaryEl = document.getElementById('footer-summary') as HTMLSpanElement;
const clearCompletedBtn = document.getElementById('clear-completed-btn') as HTMLButtonElement;
const currentDateEl = document.getElementById('current-date') as HTMLParagraphElement;

/* ==========================================================================
   DOM Element Selectors: Notes & Media
   ========================================================================== */

const notesSelect = document.getElementById('notes-select') as HTMLSelectElement;
const newNoteBtn = document.getElementById('new-note-btn') as HTMLButtonElement;
const deleteNoteBtn = document.getElementById('delete-note-btn') as HTMLButtonElement;
const noteTitleInput = document.getElementById('note-title-input') as HTMLInputElement;
const richtextEditor = document.getElementById('richtext-editor') as HTMLDivElement;
const saveNoteBtn = document.getElementById('save-note-btn') as HTMLButtonElement;
const noteMetaInfo = document.getElementById('note-meta-info') as HTMLSpanElement;

// Toolbar buttons
const toolbarBtns = document.querySelectorAll<HTMLButtonElement>('.toolbar-btn');

// Media upload & recorder
const recordAudioBtn = document.getElementById('record-audio-btn') as HTMLButtonElement;
const recordBtnText = document.getElementById('record-btn-text') as HTMLSpanElement;
const recordingTimer = document.getElementById('recording-timer') as HTMLSpanElement;
const attachFileBtn = document.getElementById('attach-file-btn') as HTMLButtonElement;
const fileAttachmentInput = document.getElementById('file-attachment-input') as HTMLInputElement;

// Containers
const audioMemosContainer = document.getElementById('audio-memos-container') as HTMLDivElement;
const attachmentsContainer = document.getElementById('attachments-container') as HTMLDivElement;

// Lightbox
const imageLightbox = document.getElementById('image-lightbox') as HTMLDivElement;
const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
const closeLightboxBtn = document.getElementById('close-lightbox') as HTMLButtonElement;

/* ==========================================================================
   Initialization
   ========================================================================== */

async function initializeApp(): Promise<void> {
  // 1. Initialize Date
  if (currentDateEl) {
    const today = new Date();
    currentDateEl.textContent = today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }

  // 2. Setup Tasks UI
  setupTaskEventListeners();
  renderTasks();

  // 3. Setup Notes UI with IndexedDB
  setupNotesEventListeners();
  await loadAndInitNotes();
}

/* ==========================================================================
   Tasks Engine
   ========================================================================== */

function renderTasks(): void {
  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const activeCount = totalCount - completedCount;

  metricCompletedEl.textContent = String(completedCount);
  metricPendingEl.textContent = String(activeCount);

  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  progressBarEl.style.width = `${percentage}%`;
  progressPercentageEl.textContent = `${percentage}%`;

  countAllEl.textContent = String(totalCount);
  countActiveEl.textContent = String(activeCount);
  countCompletedEl.textContent = String(completedCount);

  footerSummaryEl.textContent = `${activeCount} ${activeCount === 1 ? 'task' : 'tasks'} remaining`;

  const filteredTodos = todos.filter((todo) => {
    if (currentFilter === 'active' && todo.completed) return false;
    if (currentFilter === 'completed' && !todo.completed) return false;

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      return (
        todo.title.toLowerCase().includes(query) ||
        todo.category.toLowerCase().includes(query) ||
        todo.priority.toLowerCase().includes(query)
      );
    }
    return true;
  });

  todoList.innerHTML = '';

  if (filteredTodos.length === 0) {
    emptyState.classList.remove('hidden');
    const emptyTitle = emptyState.querySelector('.empty-title');
    const emptySub = emptyState.querySelector('.empty-subtitle');

    if (searchQuery.trim() !== '') {
      if (emptyTitle) emptyTitle.textContent = 'No matching tasks';
      if (emptySub) emptySub.textContent = `No tasks found matching "${searchQuery}".`;
    } else if (currentFilter === 'completed') {
      if (emptyTitle) emptyTitle.textContent = 'No completed tasks yet';
      if (emptySub) emptySub.textContent = 'Complete tasks on the left to track progress.';
    } else {
      if (emptyTitle) emptyTitle.textContent = 'All tasks cleared';
      if (emptySub) emptySub.textContent = 'Take a breath, or add a fresh item above.';
    }
  } else {
    emptyState.classList.add('hidden');
    filteredTodos.forEach((todo) => {
      todoList.appendChild(createTodoElement(todo));
    });
  }

  if (completedCount > 0) {
    clearCompletedBtn.style.opacity = '1';
    clearCompletedBtn.style.pointerEvents = 'auto';
  } else {
    clearCompletedBtn.style.opacity = '0.4';
    clearCompletedBtn.style.pointerEvents = 'none';
  }
}

function createTodoElement(todo: Todo): HTMLLIElement {
  const li = document.createElement('li');
  li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
  li.dataset.id = todo.id;

  const isEditing = editingId === todo.id;

  // Checkbox
  const checkboxLabel = document.createElement('label');
  checkboxLabel.className = 'checkbox-container';
  checkboxLabel.title = todo.completed ? 'Mark as active' : 'Mark as completed';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.addEventListener('change', () => toggleTodo(todo.id));

  const checkmark = document.createElement('div');
  checkmark.className = 'glass-checkmark';
  checkmark.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;

  checkboxLabel.appendChild(checkbox);
  checkboxLabel.appendChild(checkmark);
  li.appendChild(checkboxLabel);

  // Content
  const contentDiv = document.createElement('div');
  contentDiv.className = 'todo-content';

  if (isEditing) {
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'todo-edit-input';
    editInput.value = todo.title;
    editInput.maxLength = 120;

    const commitEdit = () => {
      const val = editInput.value.trim();
      if (val) {
        saveEdit(todo.id, val);
      } else {
        cancelEditing();
      }
    };

    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commitEdit();
      else if (e.key === 'Escape') cancelEditing();
    });

    editInput.addEventListener('blur', commitEdit);
    contentDiv.appendChild(editInput);
    setTimeout(() => {
      editInput.focus();
      editInput.select();
    }, 10);
  } else {
    const titleSpan = document.createElement('span');
    titleSpan.className = 'todo-title';
    titleSpan.textContent = todo.title;
    titleSpan.title = 'Double click to edit';
    titleSpan.addEventListener('dblclick', () => startEditing(todo.id));
    contentDiv.appendChild(titleSpan);

    const metaDiv = document.createElement('div');
    metaDiv.className = 'todo-meta';

    const priorityBadge = document.createElement('span');
    priorityBadge.className = `badge badge-priority-${todo.priority}`;
    priorityBadge.innerHTML = `<span class="badge-dot"></span>${capitalize(todo.priority)}`;

    const catBadge = document.createElement('span');
    catBadge.className = 'badge badge-category';
    catBadge.textContent = todo.category;

    metaDiv.appendChild(priorityBadge);
    metaDiv.appendChild(catBadge);
    contentDiv.appendChild(metaDiv);
  }

  li.appendChild(contentDiv);

  // Actions
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'todo-actions';

  if (!isEditing) {
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'action-icon-btn';
    editBtn.title = 'Edit task';
    editBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;
    editBtn.addEventListener('click', () => startEditing(todo.id));
    actionsDiv.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'action-icon-btn delete-btn';
    deleteBtn.title = 'Delete task';
    deleteBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
    actionsDiv.appendChild(deleteBtn);
  }

  li.appendChild(actionsDiv);
  return li;
}

function addTodo(title: string, priority: Priority, category: Category): void {
  const newTodo: Todo = {
    id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title,
    completed: false,
    priority,
    category,
    createdAt: Date.now(),
  };

  todos.unshift(newTodo);
  saveTodos(todos);
  renderTasks();
}

function toggleTodo(id: string): void {
  todos = todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
  saveTodos(todos);
  renderTasks();
}

function deleteTodo(id: string): void {
  const target = document.querySelector(`li[data-id="${id}"]`) as HTMLElement;
  if (target) {
    target.style.transition = 'opacity 180ms ease, transform 180ms ease';
    target.style.opacity = '0';
    target.style.transform = 'scale(0.95)';
    setTimeout(() => {
      todos = todos.filter((t) => t.id !== id);
      saveTodos(todos);
      renderTasks();
    }, 160);
  } else {
    todos = todos.filter((t) => t.id !== id);
    saveTodos(todos);
    renderTasks();
  }
}

function startEditing(id: string): void {
  editingId = id;
  renderTasks();
}

function saveEdit(id: string, newTitle: string): void {
  todos = todos.map((t) => (t.id === id ? { ...t, title: newTitle } : t));
  editingId = null;
  saveTodos(todos);
  renderTasks();
}

function cancelEditing(): void {
  editingId = null;
  renderTasks();
}

function clearCompleted(): void {
  todos = todos.filter((t) => !t.completed);
  saveTodos(todos);
  renderTasks();
}

function setupTaskEventListeners(): void {
  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = todoInput.value.trim();
    if (!title) {
      todoForm.classList.add('shake');
      setTimeout(() => todoForm.classList.remove('shake'), 350);
      return;
    }

    addTodo(title, prioritySelect.value as Priority, categorySelect.value as Category);
    todoInput.value = '';
    todoInput.focus();
  });

  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentFilter = (tab.dataset.filter as FilterStatus) || 'all';
      renderTasks();
    });
  });

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    clearSearchBtn.classList.toggle('hidden', searchQuery.length === 0);
    renderTasks();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    searchInput.focus();
    renderTasks();
  });

  clearCompletedBtn.addEventListener('click', clearCompleted);
}

/* ==========================================================================
   Notes & Media Workspace Engine
   ========================================================================== */

async function loadAndInitNotes(): Promise<void> {
  notes = await getAllNotes();
  if (notes.length > 0) {
    activeNote = notes[0];
  } else {
    createNewNote();
  }
  updateNotesDropdown();
  renderActiveNote();
}

function updateNotesDropdown(): void {
  notesSelect.innerHTML = '';
  notes.forEach((note) => {
    const option = document.createElement('option');
    option.value = note.id;
    option.textContent = note.title.trim() || 'Untitled Note';
    if (activeNote && note.id === activeNote.id) {
      option.selected = true;
    }
    notesSelect.appendChild(option);
  });
}

function renderActiveNote(): void {
  if (!activeNote) return;

  noteTitleInput.value = activeNote.title;
  richtextEditor.innerHTML = activeNote.contentHtml || '';

  const updatedDate = new Date(activeNote.updatedAt);
  noteMetaInfo.textContent = `Last saved: ${updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  renderAudioMemos();
  renderAttachments();
}

function createNewNote(): void {
  const newNote: Note = {
    id: `note-${Date.now()}`,
    title: '',
    contentHtml: '',
    attachments: [],
    audioMemos: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  notes.unshift(newNote);
  activeNote = newNote;
  updateNotesDropdown();
  renderActiveNote();
  noteTitleInput.focus();
}

async function saveCurrentNote(): Promise<void> {
  if (!activeNote) return;

  activeNote.title = noteTitleInput.value.trim() || 'Untitled Note';
  activeNote.contentHtml = richtextEditor.innerHTML;
  activeNote.updatedAt = Date.now();

  await dbSaveNote(activeNote);
  updateNotesDropdown();
  renderActiveNote();

  // Visual save feedback
  const originalHtml = saveNoteBtn.innerHTML;
  saveNoteBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>Saved!</span>
  `;
  setTimeout(() => {
    saveNoteBtn.innerHTML = originalHtml;
  }, 1200);
}

async function deleteCurrentNote(): Promise<void> {
  if (!activeNote) return;
  if (notes.length <= 1) {
    activeNote.title = 'New Note';
    activeNote.contentHtml = '';
    activeNote.attachments = [];
    activeNote.audioMemos = [];
    activeNote.updatedAt = Date.now();
    await dbSaveNote(activeNote);
    updateNotesDropdown();
    renderActiveNote();
    return;
  }

  await dbDeleteNote(activeNote.id);
  notes = notes.filter((n) => n.id !== activeNote!.id);
  activeNote = notes[0] || null;
  updateNotesDropdown();
  renderActiveNote();
}

/* ==========================================================================
   Rich Text Formatting & Paste / Drop Handlers
   ========================================================================== */

function setupNotesEventListeners(): void {
  // Switch note
  notesSelect.addEventListener('change', () => {
    const selectedId = notesSelect.value;
    const found = notes.find((n) => n.id === selectedId);
    if (found) {
      activeNote = found;
      renderActiveNote();
    }
  });

  newNoteBtn.addEventListener('click', createNewNote);
  deleteNoteBtn.addEventListener('click', deleteCurrentNote);
  saveNoteBtn.addEventListener('click', saveCurrentNote);

  // Auto-update note title on typing
  noteTitleInput.addEventListener('input', () => {
    if (activeNote) {
      activeNote.title = noteTitleInput.value;
      const opt = notesSelect.querySelector(`option[value="${activeNote.id}"]`);
      if (opt) opt.textContent = activeNote.title.trim() || 'Untitled Note';
    }
  });

  // Rich Text Toolbar Buttons
  toolbarBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const command = btn.dataset.command;
      const value = btn.dataset.value || undefined;
      if (command) {
        document.execCommand(command, false, value);
        richtextEditor.focus();
      }
    });
  });

  // Attach File Button
  attachFileBtn.addEventListener('click', () => {
    fileAttachmentInput.click();
  });

  fileAttachmentInput.addEventListener('change', () => {
    if (fileAttachmentInput.files) {
      handleFilesUpload(Array.from(fileAttachmentInput.files));
      fileAttachmentInput.value = '';
    }
  });

  // Drag and Drop on Editor
  richtextEditor.addEventListener('dragover', (e) => {
    e.preventDefault();
    richtextEditor.style.borderColor = 'var(--primary-azure)';
  });

  richtextEditor.addEventListener('dragleave', () => {
    richtextEditor.style.borderColor = '';
  });

  richtextEditor.addEventListener('drop', (e) => {
    e.preventDefault();
    richtextEditor.style.borderColor = '';
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      handleFilesUpload(Array.from(e.dataTransfer.files));
    }
  });

  // Paste image handler from clipboard
  richtextEditor.addEventListener('paste', (e) => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
      const files = Array.from(e.clipboardData.files);
      const images = files.filter((f) => f.type.startsWith('image/'));
      if (images.length > 0) {
        handleFilesUpload(images);
      }
    }
  });

  // Voice Recording Button
  recordAudioBtn.addEventListener('click', toggleAudioRecording);

  // Lightbox close
  closeLightboxBtn.addEventListener('click', () => imageLightbox.classList.add('hidden'));
  imageLightbox.addEventListener('click', (e) => {
    if (e.target === imageLightbox || e.target === imageLightbox.querySelector('.lightbox-backdrop')) {
      imageLightbox.classList.add('hidden');
    }
  });
}

/* ==========================================================================
   File & Document Attachments Engine
   ========================================================================== */

function handleFilesUpload(files: File[]): void {
  if (!activeNote) return;

  files.forEach((file) => {
    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();

    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const attachment: NoteAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
        isImage,
      };

      activeNote!.attachments.push(attachment);
      await dbSaveNote(activeNote!);
      renderAttachments();
    };

    reader.readAsDataURL(file);
  });
}

function renderAttachments(): void {
  attachmentsContainer.innerHTML = '';
  if (!activeNote || activeNote.attachments.length === 0) return;

  const images = activeNote.attachments.filter((a) => a.isImage);
  const docs = activeNote.attachments.filter((a) => !a.isImage);

  // Render Image Grid
  if (images.length > 0) {
    const grid = document.createElement('div');
    grid.className = 'images-grid';

    images.forEach((imgAtt) => {
      const card = document.createElement('div');
      card.className = 'image-thumb-card';
      card.innerHTML = `
        <img src="${imgAtt.dataUrl}" alt="${imgAtt.name}" />
        <button class="thumb-delete-btn" title="Remove image">✕</button>
      `;

      // Open lightbox
      card.querySelector('img')?.addEventListener('click', () => {
        lightboxImg.src = imgAtt.dataUrl;
        imageLightbox.classList.remove('hidden');
      });

      // Delete image
      card.querySelector('.thumb-delete-btn')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        activeNote!.attachments = activeNote!.attachments.filter((a) => a.id !== imgAtt.id);
        await dbSaveNote(activeNote!);
        renderAttachments();
      });

      grid.appendChild(card);
    });

    attachmentsContainer.appendChild(grid);
  }

  // Render Document Chips
  if (docs.length > 0) {
    const docsList = document.createElement('div');
    docsList.className = 'docs-list';

    docs.forEach((docAtt) => {
      const chip = document.createElement('div');
      chip.className = 'doc-chip';
      chip.innerHTML = `
        <div class="doc-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <div>
            <div class="doc-name" title="${docAtt.name}">${docAtt.name}</div>
            <div class="doc-size">${formatFileSize(docAtt.size)}</div>
          </div>
        </div>
        <div class="doc-actions">
          <a href="${docAtt.dataUrl}" download="${docAtt.name}" class="doc-action-link" title="Download">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </a>
          <button type="button" class="action-icon-btn delete-btn delete-doc-btn" title="Remove document">
            ✕
          </button>
        </div>
      `;

      chip.querySelector('.delete-doc-btn')?.addEventListener('click', async () => {
        activeNote!.attachments = activeNote!.attachments.filter((a) => a.id !== docAtt.id);
        await dbSaveNote(activeNote!);
        renderAttachments();
      });

      docsList.appendChild(chip);
    });

    attachmentsContainer.appendChild(docsList);
  }
}

/* ==========================================================================
   Voice Audio Recording Engine
   ========================================================================== */

async function toggleAudioRecording(): Promise<void> {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    // Stop recording
    mediaRecorder.stop();
    stopRecordingTimer();
    recordAudioBtn.classList.remove('recording');
    recordBtnText.textContent = 'Voice Memo';
    recordingTimer.classList.add('hidden');
  } else {
    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          const audioDataUrl = reader.result as string;
          const durationSec = Math.max(1, Math.round((Date.now() - recordingStartTime) / 1000));

          const audioMemo: AudioMemo = {
            id: `audio-${Date.now()}`,
            audioDataUrl,
            durationSec,
            createdAt: Date.now(),
          };

          if (activeNote) {
            activeNote.audioMemos.push(audioMemo);
            await dbSaveNote(activeNote);
            renderAudioMemos();
          }
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      recordingStartTime = Date.now();
      startRecordingTimer();

      recordAudioBtn.classList.add('recording');
      recordBtnText.textContent = 'Stop Recording';
      recordingTimer.classList.remove('hidden');
    } catch (err) {
      console.error('Microphone access denied or unavailable:', err);
      alert('Microphone access is required to record voice memos. Please grant microphone permissions.');
    }
  }
}

function startRecordingTimer(): void {
  stopRecordingTimer();
  recordingTimer.textContent = '00:00';
  recordingTimerInterval = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    recordingTimer.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopRecordingTimer(): void {
  if (recordingTimerInterval !== null) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }
}

function renderAudioMemos(): void {
  audioMemosContainer.innerHTML = '';
  if (!activeNote || activeNote.audioMemos.length === 0) return;

  activeNote.audioMemos.forEach((memo) => {
    const card = document.createElement('div');
    card.className = 'audio-memo-card';

    const audio = new Audio(memo.audioDataUrl);

    card.innerHTML = `
      <button type="button" class="audio-play-btn" title="Play audio">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </button>
      <input type="range" class="audio-track-slider" min="0" max="100" value="0" />
      <span class="audio-duration">${formatTime(memo.durationSec)}</span>
      <button type="button" class="audio-delete-btn" title="Delete voice memo">✕</button>
    `;

    const playBtn = card.querySelector('.audio-play-btn') as HTMLButtonElement;
    const slider = card.querySelector('.audio-track-slider') as HTMLInputElement;
    const deleteBtn = card.querySelector('.audio-delete-btn') as HTMLButtonElement;

    playBtn.addEventListener('click', () => {
      if (audio.paused) {
        audio.play();
        playBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        `;
      } else {
        audio.pause();
        playBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        `;
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        slider.value = String((audio.currentTime / audio.duration) * 100);
      }
    });

    audio.addEventListener('ended', () => {
      playBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
      slider.value = '0';
    });

    slider.addEventListener('input', () => {
      if (!isNaN(audio.duration)) {
        audio.currentTime = (Number(slider.value) / 100) * audio.duration;
      }
    });

    deleteBtn.addEventListener('click', async () => {
      audio.pause();
      activeNote!.audioMemos = activeNote!.audioMemos.filter((m) => m.id !== memo.id);
      await dbSaveNote(activeNote!);
      renderAudioMemos();
    });

    audioMemosContainer.appendChild(card);
  });
}

/* ==========================================================================
   Formatting & Utility Helpers
   ========================================================================== */

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Start Application
initializeApp();

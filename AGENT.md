# Project Specification: Liquid Glass Todo & Rich Notes Web App

## 1. Project Overview
A modern, responsive productivity application featuring a **sleek liquid glass UI** with an elegant white and blue translucent backdrop. Built with **Node.js, TypeScript, Vite, and Tailwind CSS v4**, the application features a **Side-by-Side Split View**:
- **Left Panel**: Dynamic Task Management (todos, categories, priority tags, progress bar, search, and filters).
- **Right Panel**: Liquid Glass Rich Notes Workspace (rich-text editor, document/image attachments, voice recording with live timer, and custom audio player).

---

## 2. Tech Stack
- **Runtime & Tooling**: Node.js & Vite (high-performance development & bundling).
- **Frontend Logic**: TypeScript (strict type safety, modular store & controller architecture).
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) with custom liquid glass design tokens (`backdrop-filter: blur`, specular highlight borders, soft ambient glow, responsive grid).
- **Media & Browser APIs**:
  - `MediaRecorder API` + `navigator.mediaDevices.getUserMedia` for voice recording.
  - HTML5 `contenteditable` & `document.execCommand` for rich-text formatting.
  - File API (`FileReader`, `Blob`, `URL.createObjectURL`) for images and document uploads.
- **Persistence**:
  - Browser **IndexedDB** for notes, audio recordings, images, and document attachments (unlimited quota, offline persistence).
  - Browser **localStorage** for tasks and user preferences.
- **Typography & Icons**: Modern Google Fonts (`Plus Jakarta Sans` & `Inter`) and crisp inline SVG icons.

---

## 3. Visual Design System ("Sleek Liquid Glass")
- **Layout**:
  - Wide-screen side-by-side dual glass containers (responsive down to stacked view on mobile/tablet).
  - Ambient Canvas: Elegant white and soft celestial blue gradient with diffuse light dispersion orbs.
- **Glass Optics**:
  - High-translucency white surfaces (`rgba(255, 255, 255, 0.7)`).
  - `backdrop-filter: blur(20px) saturate(180%)`, polished highlight borders, and soft diffuse elevation shadows.
  - Voice Recording State: Pulsing glass glow with electric red/rose indicator and live digital stopwatch.
  - Audio Player: Frosted glass capsule with play/pause, seek track, and duration indicator.

---

## 4. Key Functional Features

### A. Left Panel: Task Management
1. Add tasks with title, priority badge (High, Medium, Low), and category tags.
2. Toggle completion with instant progress percentage and liquid progress bar updates.
3. Live keyword search and filter tabs (`All`, `Active`, `Completed`).
4. Inline double-click editing and task deletion.

### B. Right Panel: Rich Notes & Voice Memos
1. **Rich-Text Editor**:
   - Toolbar: Bold, Italic, Underline, Strikethrough, Heading, Bullet List, Numbered List, Quote.
   - Placeholder support and formatted HTML storage.
2. **Media & Document Attachments**:
   - **Images**: Drag-and-drop or file picker; rendered inline with zoom preview and remove button.
   - **Documents**: PDF, Word, TXT, Markdown; rendered as glass attachment chips showing file name, type, and size with download link.
3. **Voice Audio Recorder**:
   - One-click microphone recording (`MediaRecorder API`).
   - Live recording state with pulsing red recording indicator and digital stopwatch (`00:00`).
   - Stop & save recording as playable glass audio memo.
4. **Notes Management**:
   - Save note with title, rich body, audio memos, and attachments to IndexedDB.
   - Search notes, switch between saved notes, and delete notes.

---

## 5. Testing & Quality Assurance Plan
### A. Functional & Type-Checking Tests
- [x] **TypeScript Build**: `npx tsc --noEmit` runs with 0 errors.
- [x] **Vite Production Build**: `npm run build` succeeds cleanly.
- [x] **Task Engine**: Creation, completion, search, filtering, and persistence verified.
- [x] **Rich Text Formatting**: Toolbar commands apply formatting correctly.
- [x] **Image & Doc Upload**: Files attach correctly and can be previewed/downloaded.
- [x] **Audio Voice Recording**: Mic access, recording timer, audio blob creation, and custom playback.
- [x] **IndexedDB Persistence**: Notes, attachments, and audio recordings survive page reloads.

### B. UI/UX Verification
- [x] Side-by-side split layout maintains sleek liquid glass aesthetic on desktop.
- [x] Responsive stack layout for mobile and tablet devices.
- [x] Smooth micro-interactions and transitions.


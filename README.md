# Prompt Workbench

A professional prompt engineering workbench for managing and versioning your prompts with real-time diff comparison and local file backup.

## ✨ Features

### 📝 Professional Editor
- Monaco Editor integration with syntax highlighting
- Real-time character and token count display
- Markdown editing support

### 🔄 Version Control
- Manual version saving with diff preview
- Visual diff comparison before saving
- Version history browsing
- Version descriptions for tracking changes
- Export versions as Markdown files

### 📁 Project Management
- Multiple project support
- Folder organization for projects
- Local file backup (auto-save to `/prompts` folder)
- Drag and drop project organization

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: Tailwind CSS + Radix UI
- **Editor**: Monaco Editor
- **State**: Zustand
- **Storage**: IndexedDB + Local Files
- **Diff**: react-diff-viewer-continued

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Mac One-Click Start

Double-click `start.command` to:
1. Auto-install dependencies (if needed)
2. Start the development server
3. Open browser automatically

## 📖 Usage

### Creating a Project

1. Click the **+** button in the project panel
2. Enter a project name
3. Start writing your prompt in the editor

### Saving Versions

1. Edit your prompt content
2. Click the **Save** button
3. Review the diff comparison
4. Add a version description (optional)
5. Click **Confirm Save**

### Organizing Projects

- Create folders with the folder button
- Drag projects into folders
- Right-click to rename or delete

### Exporting Data

- **Single prompt**: Click the download icon in the toolbar to export as Markdown

## 📁 Project Structure

```
├── app/
│   ├── api/              # API routes (load-local, save-local, structure)
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page
├── components/
│   ├── editor/           # Editor and toolbar
│   ├── project/          # Project management
│   └── version/          # Version selector
├── lib/
│   ├── stores/           # Zustand stores
│   └── utils.ts          # Utility functions
├── types/                # TypeScript types
└── prompts/              # Local prompt backups (auto-generated)
```

## 🔧 Development

```bash
# Run development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ for prompt engineers

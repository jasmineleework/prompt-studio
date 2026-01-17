# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Prompt Workbench - a specialized tool for managing and versioning prompts. The application focuses on version control, project organization, and local file backup.

## Core Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript
- **UI Components**: shadcn/ui + Tailwind CSS + Radix UI
- **Editor**: Monaco Editor (@monaco-editor/react)
- **State Management**: Zustand
- **Storage**: IndexedDB (via idb library)
- **Version Comparison**: react-diff-viewer-continued

### Key Architectural Decisions

1. **Automatic Versioning System**: Every save creates a new version entry. Version numbers increment sequentially (v1, v2, v3...).

2. **Storage Strategy**: Using IndexedDB for local persistence of projects, versions, and folders. Each project maintains its own version history. Local file backup to `/prompts` folder.

3. **Component Structure**:
   - `/components/editor/` - Monaco Editor wrapper with toolbar
   - `/components/project/` - Project management UI with folder support
   - `/components/version/` - Version selector component

4. **State Management Pattern**: Zustand stores in `/lib/stores/` manage:
   - Current project state
   - Active version
   - Editor content

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## Critical Implementation Notes

### Version Control Implementation
- Version saves are triggered by explicit save action with diff preview
- Each version stores: content, timestamp, version number, description, and metadata
- Diff comparison uses react-diff-viewer-continued
- All versions are preserved (never overwrites history)

### Local File Backup
- Prompts are auto-saved to `/prompts/{project_name}/` folder
- Structure configuration saved in `/prompts/structure.json`
- Supports folder organization for projects

### Data Models

```typescript
interface Version {
  id: string;
  projectId: string;
  versionNumber: number;
  content: string;
  timestamp: Date;
  description?: string;
  metadata: {
    lines: number;
    characters: number;
    words: number;
    changeType: 'minor' | 'major' | 'patch';
  }
}

interface Project {
  id: string;
  name: string;
  description?: string;
  folderId?: string;
  currentVersion: number;
  config: ProjectConfig;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    category: string;
  }
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  collapsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Routes Structure

- `/api/load-local` - Load projects from local `/prompts` folder
- `/api/save-local` - Save prompt version to local file
- `/api/structure` - Manage folder structure configuration

## UI Layout Convention

The application uses a two-panel layout:
- **Left**: Project list with folder organization
- **Center**: Monaco Editor with version selector and toolbar

## Common Patterns

### Version Save Flow
```typescript
// 1. User clicks Save button
// 2. Diff dialog shows comparison with previous version
// 3. User adds description and confirms
// 4. New version created in IndexedDB
// 5. Content saved to local file
```

### Version Comparison
Always use react-diff-viewer-continued for consistent diff visualization across the application.

## Known Constraints

1. All data is stored locally in browser (IndexedDB)
2. Local file backup to `/prompts` folder for persistence
3. No backend database - IndexedDB + local files for storage

## Testing Guidelines

### Test Data Isolation (Important!)

测试数据与真实数据完全隔离，不会损坏用户数据：

| 环境 | 文件存储 | IndexedDB |
|------|---------|-----------|
| 生产 | `prompts/` | `PromptWorkbench` |
| 测试 | `prompts-test/` | `PromptWorkbench_Test` |

测试运行时自动：
1. 创建独立的 `prompts-test/` 目录
2. 使用独立的 `PromptWorkbench_Test` 数据库
3. 测试结束后可选择清理或保留数据用于调试

### Test Structure

The project uses a comprehensive testing strategy:

- **Unit Tests**: Vitest + Testing Library for component tests (`*.spec.tsx`)
- **E2E Tests**: Playwright for end-to-end testing (`e2e/tests/*.spec.ts`)

### E2E Test Requirements

1. **新功能必须配套测试**: 
   - 每个新增的用户可见功能必须有对应的 E2E 测试用例
   - 测试文件位于 `e2e/tests/` 目录
   - 使用 Page Object 模式封装页面操作（见 `e2e/helpers/page-objects.ts`）

2. **测试覆盖场景**:
   - 基础功能测试（正常流程）
   - 浏览器刷新后数据恢复（验证 IndexedDB 持久化）
   - 后端重启后数据恢复（验证本地文件同步）
   - 边界情况和错误处理

3. **测试命名规范**:
   - 文件名: `{feature-name}.spec.ts`
   - 测试描述使用中文，便于理解
   - 使用 `test.describe()` 组织测试分组

4. **大型改动合并前检查**:
   - 必须运行 `npm run test:e2e` 并全部通过
   - 确保所有现有测试不受影响

### Test Commands

```bash
# 运行单元测试
npm run test

# 运行所有 E2E 测试
npm run test:e2e

# UI 模式运行 E2E 测试（调试用）
npm run test:e2e:ui

# 带浏览器界面运行
npm run test:e2e:headed

# 调试模式
npm run test:e2e:debug

# 查看测试报告
npm run test:e2e:report

# 运行特定测试（按名称匹配）
npm run test:e2e:grep "项目管理"

# 运行单个测试文件
npm run test:e2e:file e2e/tests/project-management.spec.ts

# 运行并自动清理测试数据
npm run test:e2e:clean

# 运行所有测试（单元 + E2E）
npm run test:all
```

### E2E Test File Structure

```
e2e/
├── playwright.config.ts          # Playwright 配置
├── global-setup.ts               # 全局设置（创建测试目录）
├── global-teardown.ts            # 全局清理（可选清理测试数据）
├── fixtures/
│   └── test-fixtures.ts          # 共享 fixtures（自动设置测试环境）
├── helpers/
│   ├── page-objects.ts           # Page Object 模式封装
│   ├── test-utils.ts             # 测试工具函数
│   └── server-control.ts         # 后端服务控制
└── tests/
    ├── project-management.spec.ts    # 项目管理测试
    ├── folder-management.spec.ts     # 文件夹管理测试
    ├── editor.spec.ts                # 编辑器功能测试
    ├── version-control.spec.ts       # 版本控制测试
    ├── search.spec.ts                # 搜索功能测试
    ├── export.spec.ts                # 导出功能测试
    └── persistence.spec.ts           # 数据持久化专项测试
```

### Writing New Tests

When adding a new feature, follow this pattern:

```typescript
import { test, expect } from '../fixtures/test-fixtures'
import { waitForAppReady, cleanupTestProject } from '../helpers/test-utils'

test.describe('新功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })
  
  test.describe('基础功能', () => {
    test('功能描述', async ({ projectPanel, editor, testData }) => {
      // 测试实现
    })
  })
  
  test.describe('浏览器刷新场景', () => {
    test('刷新后数据保持', async ({ page, testData }) => {
      // 操作 -> 刷新 -> 验证
    })
  })
  
  test.describe('后端重启场景', () => {
    test('重启后数据恢复', async ({ page, testData }) => {
      // 操作 -> 清除 IndexedDB -> 刷新 -> 验证从本地文件恢复
    })
  })
})
```

### Version Release Testing Checklist

每次大版本发布前，确保以下测试通过：

- [ ] 项目管理测试通过
- [ ] 文件夹管理测试通过
- [ ] 编辑器功能测试通过
- [ ] 版本控制测试通过
- [ ] 搜索功能测试通过
- [ ] 导出功能测试通过
- [ ] 浏览器刷新恢复测试通过
- [ ] 后端重启恢复测试通过

## Code Simplification Guidelines

> Integrated from [code-simplifier plugin](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/code-simplifier)

When refining code, follow these principles to enhance clarity, consistency, and maintainability while preserving exact functionality:

### 1. Preserve Functionality
Never change what the code does - only how it does it. All original features, outputs, and behaviors must remain intact.

### 2. Apply Project Standards
Follow established coding standards including:
- Use ES modules with proper import sorting and extensions
- Prefer `function` keyword over arrow functions for top-level functions
- Use explicit return type annotations for top-level functions
- Follow proper React component patterns with explicit Props types
- Use proper error handling patterns (avoid try/catch when possible)
- Maintain consistent naming conventions

### 3. Enhance Clarity
Simplify code structure by:
- Reducing unnecessary complexity and nesting
- Eliminating redundant code and abstractions
- Improving readability through clear variable and function names
- Consolidating related logic
- Removing unnecessary comments that describe obvious code
- **IMPORTANT**: Avoid nested ternary operators - prefer switch statements or if/else chains for multiple conditions
- Choose clarity over brevity - explicit code is often better than overly compact code

### 4. Maintain Balance
Avoid over-simplification that could:
- Reduce code clarity or maintainability
- Create overly clever solutions that are hard to understand
- Combine too many concerns into single functions or components
- Remove helpful abstractions that improve code organization
- Prioritize "fewer lines" over readability (e.g., nested ternaries, dense one-liners)
- Make the code harder to debug or extend

### 5. Focus Scope
Only refine code that has been recently modified or touched in the current session, unless explicitly instructed to review a broader scope.

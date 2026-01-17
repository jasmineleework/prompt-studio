import '@testing-library/jest-dom'
import { beforeEach, vi } from 'vitest'
import React from 'react'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}))

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement('img', props)
  }
}))

// Mock IndexedDB for browser storage
const mockIDB = {
  open: vi.fn(() => Promise.resolve({
    createObjectStore: vi.fn(),
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        add: vi.fn(() => Promise.resolve()),
        put: vi.fn(() => Promise.resolve()),
        get: vi.fn(() => Promise.resolve()),
        delete: vi.fn(() => Promise.resolve()),
        getAll: vi.fn(() => Promise.resolve([])),
        index: vi.fn(() => ({
          getAll: vi.fn(() => Promise.resolve([]))
        }))
      }))
    }))
  })),
  deleteDatabase: vi.fn(() => Promise.resolve())
}

Object.defineProperty(global, 'indexedDB', {
  value: mockIDB,
  writable: true
})

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, onMount }: any) => {
    return React.createElement('textarea', {
      'data-testid': 'monaco-editor',
      value: value,
      onChange: (e: any) => onChange?.(e.target.value),
      onFocus: () => onMount?.({
        getValue: () => value,
        setValue: vi.fn(),
        focus: vi.fn()
      })
    })
  }
}))

// Mock Zustand stores
vi.mock('@/lib/stores/projectStore', () => ({
  useProjectStore: () => ({
    projects: [],
    folders: [],
    currentProject: null,
    isLoading: false,
    loadProjects: vi.fn(),
    createProject: vi.fn(),
    selectProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    createFolder: vi.fn(),
    updateFolder: vi.fn(),
    deleteFolder: vi.fn(),
    toggleFolderCollapse: vi.fn(),
    moveProjectToFolder: vi.fn()
  })
}))

vi.mock('@/lib/stores/versionStore', () => ({
  useVersionStore: () => ({
    versions: [],
    currentVersion: null,
    isLoading: false,
    loadVersions: vi.fn(),
    createVersion: vi.fn(),
    selectVersion: vi.fn(),
    deleteVersion: vi.fn()
  })
}))

vi.mock('@/lib/stores/editorStore', () => ({
  useEditorStore: () => ({
    content: '',
    setContent: vi.fn(),
    loadContent: vi.fn(),
    isDirty: false,
    setDirty: vi.fn()
  })
}))

// Global setup for each test
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()
  
  // Reset DOM
  document.body.innerHTML = ''
})
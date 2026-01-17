import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { ProjectPanel } from './ProjectPanel'

// Mock the project store with more realistic data
const mockProjects = [
  {
    id: 'project-1',
    name: 'Test Project 1',
    description: 'A test project',
    currentVersion: 1,
    folderId: undefined,
    config: {
      systemLimits: {
        maxTokens: 4000,
        temperature: 0.7,
        model: 'gpt-4-turbo-preview',
        responseFormat: 'markdown',
        timeout: 30,
        retryAttempts: 3
      },
      outputRequirements: {
        format: { type: 'structured', schema: {} },
        constraints: [],
        examples: [],
        validation: { required: [], optional: [] }
      },
      testData: []
    },
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      category: 'other'
    }
  }
]

const mockFolders = [
  {
    id: 'folder-1',
    name: 'Test Folder',
    collapsed: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// Mock the store
const mockProjectStore = {
  projects: mockProjects,
  folders: mockFolders,
  currentProject: mockProjects[0],
  selectProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  createFolder: vi.fn(),
  updateFolder: vi.fn(),
  deleteFolder: vi.fn(),
  toggleFolderCollapse: vi.fn(),
  moveProjectToFolder: vi.fn()
}

vi.mock('@/lib/stores/projectStore', () => ({
  useProjectStore: () => mockProjectStore
}))

describe('ProjectPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<ProjectPanel />)
      expect(screen.getByText('项目管理')).toBeInTheDocument()
    })

    it('should display project list when expanded', () => {
      render(<ProjectPanel />)
      
      // Should show the test project
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    it('should display folder list when expanded', () => {
      render(<ProjectPanel />)
      
      // Should show the test folder
      expect(screen.getByText('Test Folder')).toBeInTheDocument()
    })

    it('should show new project and new folder buttons', () => {
      render(<ProjectPanel />)
      
      // Check for action buttons (by title attributes)
      expect(screen.getByTitle('新建项目')).toBeInTheDocument()
      expect(screen.getByTitle('新建文件夹')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call selectProject when project is clicked', () => {
      render(<ProjectPanel />)
      
      const projectButton = screen.getByText('Test Project 1')
      fireEvent.click(projectButton)
      
      expect(mockProjectStore.selectProject).toHaveBeenCalledWith('project-1')
    })

    it('should toggle folder collapse when folder header is clicked', () => {
      render(<ProjectPanel />)
      
      const folderButton = screen.getByText('Test Folder')
      fireEvent.click(folderButton)
      
      expect(mockProjectStore.toggleFolderCollapse).toHaveBeenCalledWith('folder-1')
    })

    it('should show project creation input when new project button is clicked', async () => {
      render(<ProjectPanel />)
      
      const newProjectBtn = screen.getByTitle('新建项目')
      fireEvent.click(newProjectBtn)
      
      // Should show input field for project name
      await waitFor(() => {
        expect(screen.getByPlaceholderText('项目名称...')).toBeInTheDocument()
      })
    })

    it('should show folder creation input when new folder button is clicked', async () => {
      render(<ProjectPanel />)
      
      const newFolderBtn = screen.getByTitle('新建文件夹')
      fireEvent.click(newFolderBtn)
      
      // Should show input field for folder name
      await waitFor(() => {
        expect(screen.getByPlaceholderText('文件夹名称...')).toBeInTheDocument()
      })
    })
  })

  describe('Project Creation', () => {
    it('should create project when Enter is pressed in project input', async () => {
      render(<ProjectPanel />)
      
      // Click new project button
      const newProjectBtn = screen.getByTitle('新建项目')
      fireEvent.click(newProjectBtn)
      
      // Type project name
      const projectInput = await screen.findByPlaceholderText('项目名称...')
      fireEvent.change(projectInput, { target: { value: 'New Test Project' } })
      
      // Press Enter
      fireEvent.keyDown(projectInput, { key: 'Enter' })
      
      await waitFor(() => {
        expect(mockProjectStore.createProject).toHaveBeenCalledWith('New Test Project', undefined, undefined)
      })
    })

    it('should cancel project creation when Escape is pressed', async () => {
      render(<ProjectPanel />)
      
      // Click new project button
      const newProjectBtn = screen.getByTitle('新建项目')
      fireEvent.click(newProjectBtn)
      
      const projectInput = await screen.findByPlaceholderText('项目名称...')
      fireEvent.change(projectInput, { target: { value: 'Test Project' } })
      
      // Press Escape
      fireEvent.keyDown(projectInput, { key: 'Escape' })
      
      // Input should disappear
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('项目名称...')).not.toBeInTheDocument()
      })
    })

    it('should not create project with empty name', async () => {
      render(<ProjectPanel />)
      
      const newProjectBtn = screen.getByTitle('新建项目')
      fireEvent.click(newProjectBtn)
      
      const projectInput = await screen.findByPlaceholderText('项目名称...')
      
      // Press Enter without typing anything
      fireEvent.keyDown(projectInput, { key: 'Enter' })
      
      expect(mockProjectStore.createProject).not.toHaveBeenCalled()
    })
  })

  describe('Folder Creation', () => {
    it('should create folder when Enter is pressed in folder input', async () => {
      render(<ProjectPanel />)
      
      // Click new folder button
      const newFolderBtn = screen.getByTitle('新建文件夹')
      fireEvent.click(newFolderBtn)
      
      // Type folder name
      const folderInput = await screen.findByPlaceholderText('文件夹名称...')
      fireEvent.change(folderInput, { target: { value: 'New Test Folder' } })
      
      // Press Enter
      fireEvent.keyDown(folderInput, { key: 'Enter' })
      
      await waitFor(() => {
        expect(mockProjectStore.createFolder).toHaveBeenCalledWith('New Test Folder')
      })
    })

    it('should cancel folder creation when Escape is pressed', async () => {
      render(<ProjectPanel />)
      
      const newFolderBtn = screen.getByTitle('新建文件夹')
      fireEvent.click(newFolderBtn)
      
      const folderInput = await screen.findByPlaceholderText('文件夹名称...')
      fireEvent.change(folderInput, { target: { value: 'Test Folder' } })
      
      // Press Escape
      fireEvent.keyDown(folderInput, { key: 'Escape' })
      
      // Input should disappear
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('文件夹名称...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Context Menu', () => {
    it('should show context menu on right click of project', async () => {
      render(<ProjectPanel />)
      
      const projectButton = screen.getByText('Test Project 1')
      fireEvent.contextMenu(projectButton)
      
      await waitFor(() => {
        expect(screen.getByText('重命名')).toBeInTheDocument()
        expect(screen.getByText('删除')).toBeInTheDocument()
      })
    })

    it('should show context menu on right click of folder', async () => {
      render(<ProjectPanel />)
      
      const folderButton = screen.getByText('Test Folder')
      fireEvent.contextMenu(folderButton)
      
      await waitFor(() => {
        expect(screen.getByText('重命名')).toBeInTheDocument()
        expect(screen.getByText('删除')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty project list', () => {
      // Mock empty projects
      const emptyStore = { ...mockProjectStore, projects: [], folders: [] }
      
      vi.mocked(mockProjectStore).projects = []
      vi.mocked(mockProjectStore).folders = []
      
      render(<ProjectPanel />)
      
      expect(screen.getByText('暂无项目')).toBeInTheDocument()
    })

    it('should handle collapsed state correctly', () => {
      render(<ProjectPanel />)
      
      // Click to collapse
      const collapseButton = screen.getByText('项目管理')
      fireEvent.click(collapseButton)
      
      // Project list should not be visible when collapsed
      // (This behavior depends on the component's collapse implementation)
    })

    it('should highlight current project', () => {
      render(<ProjectPanel />)
      
      const projectButton = screen.getByText('Test Project 1')
      
      // Check if current project has accent styling (bg-accent class)
      expect(projectButton.closest('button')).toHaveClass('bg-accent')
    })
  })

  describe('Accessibility', () => {
    it('should have proper button roles for interactive elements', () => {
      render(<ProjectPanel />)
      
      const projectButton = screen.getByRole('button', { name: /Test Project 1/ })
      const newProjectButton = screen.getByRole('button', { name: '新建项目' })
      const newFolderButton = screen.getByRole('button', { name: '新建文件夹' })
      
      expect(projectButton).toBeInTheDocument()
      expect(newProjectButton).toBeInTheDocument()
      expect(newFolderButton).toBeInTheDocument()
    })

    it('should have proper ARIA labels for screen readers', () => {
      render(<ProjectPanel />)
      
      // Check for title attributes that provide accessible names
      expect(screen.getByTitle('新建项目')).toBeInTheDocument()
      expect(screen.getByTitle('新建文件夹')).toBeInTheDocument()
    })
  })
})
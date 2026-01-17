import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { SearchBar } from './SearchBar'

// Mock the search store
const mockSearchStore = {
  searchQuery: '',
  searchMode: 'all' as const,
  isSearching: false,
  searchOpen: false,
  searchResults: [],
  totalResults: 0,
  searchHistory: [],
  openSearch: vi.fn(),
  closeSearch: vi.fn(),
  search: vi.fn(),
  setSearchMode: vi.fn(),
  clearSearch: vi.fn(),
  clearSearchHistory: vi.fn()
}

// Mock useDebounce hook - return value immediately for testing
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string, delay: number) => value
}))

// Mock project and version stores
const mockProjectStore = {
  selectProject: vi.fn()
}

const mockVersionStore = {
  setCurrentVersionNumber: vi.fn()
}

// Mock search store
vi.mock('@/lib/stores/searchStore', () => ({
  useSearchStore: () => mockSearchStore
}))

vi.mock('@/lib/stores/projectStore', () => ({
  useProjectStore: () => mockProjectStore
}))

vi.mock('@/lib/stores/versionStore', () => ({
  useVersionStore: () => mockVersionStore
}))

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock store state
    mockSearchStore.searchQuery = ''
    mockSearchStore.searchMode = 'all'
    mockSearchStore.isSearching = false
    mockSearchStore.searchOpen = false
    mockSearchStore.searchResults = []
    mockSearchStore.totalResults = 0
    mockSearchStore.searchHistory = []
  })

  describe('Rendering', () => {
    it('should render without crashing when closed', () => {
      render(<SearchBar />)
      expect(screen.getByRole('button', { name: /搜索/ })).toBeInTheDocument()
    })

    it('should render search button when closed', () => {
      render(<SearchBar />)
      
      expect(screen.getByRole('button', { name: /搜索/ })).toBeInTheDocument()
      expect(screen.getByText('⌘K')).toBeInTheDocument()
    })

    it('should render search input when open', () => {
      mockSearchStore.searchOpen = true
      
      render(<SearchBar />)
      
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/搜索项目、版本或内容/)).toBeInTheDocument()
    })

    it('should show loading state when searching', () => {
      mockSearchStore.searchOpen = true
      mockSearchStore.isSearching = true
      
      render(<SearchBar />)
      
      expect(screen.getByPlaceholderText('搜索中...')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('should display search mode filter button', () => {
      mockSearchStore.searchOpen = true
      
      render(<SearchBar />)
      
      expect(screen.getByText('全部')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should open search when button is clicked', () => {
      render(<SearchBar />)
      
      const searchButton = screen.getByRole('button', { name: /搜索/ })
      fireEvent.click(searchButton)
      
      expect(mockSearchStore.openSearch).toHaveBeenCalledTimes(1)
    })

    it('should close search when ESC button is clicked', () => {
      mockSearchStore.searchOpen = true
      
      render(<SearchBar />)
      
      const escButton = screen.getByText('ESC')
      fireEvent.click(escButton)
      
      expect(mockSearchStore.closeSearch).toHaveBeenCalledTimes(1)
    })

    it('should call search when typing', async () => {
      mockSearchStore.searchOpen = true
      const user = userEvent.setup()
      
      render(<SearchBar />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      
      // Should be called for the complete input due to debounce
      expect(mockSearchStore.search).toHaveBeenCalled()
      expect(mockSearchStore.search).toHaveBeenCalledWith('test')
    })
  })

  describe('Search Mode', () => {
    beforeEach(() => {
      mockSearchStore.searchOpen = true
    })

    it('should display current search mode', () => {
      mockSearchStore.searchMode = 'title'
      
      render(<SearchBar />)
      
      expect(screen.getByText('标题')).toBeInTheDocument()
    })

    it('should show mode menu when filter button is clicked', () => {
      render(<SearchBar />)
      
      const filterButton = screen.getByText('全部')
      fireEvent.click(filterButton)
      
      // Should show all mode options
      expect(screen.getAllByText('全部')).toHaveLength(2) // One in button, one in menu
      expect(screen.getByText('标题')).toBeInTheDocument()
      expect(screen.getByText('内容')).toBeInTheDocument()
      expect(screen.getByText('描述')).toBeInTheDocument()
    })

    it('should change search mode when option is selected', () => {
      render(<SearchBar />)
      
      const filterButton = screen.getByText('全部')
      fireEvent.click(filterButton)
      
      const titleOption = screen.getByText('标题')
      fireEvent.click(titleOption)
      
      expect(mockSearchStore.setSearchMode).toHaveBeenCalledWith('title')
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should open search on Cmd+K', () => {
      render(<SearchBar />)
      
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
      
      expect(mockSearchStore.openSearch).toHaveBeenCalledTimes(1)
    })

    it('should open search on Ctrl+K', () => {
      render(<SearchBar />)
      
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
      
      expect(mockSearchStore.openSearch).toHaveBeenCalledTimes(1)
    })

    it('should close search on Escape when open', () => {
      mockSearchStore.searchOpen = true
      
      render(<SearchBar />)
      
      fireEvent.keyDown(window, { key: 'Escape' })
      
      expect(mockSearchStore.closeSearch).toHaveBeenCalledTimes(1)
    })

    it('should toggle search when already open with Cmd+K', () => {
      mockSearchStore.searchOpen = true
      
      render(<SearchBar />)
      
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
      
      expect(mockSearchStore.closeSearch).toHaveBeenCalledTimes(1)
    })
  })

  describe('State Synchronization', () => {
    it('should sync with global search state', () => {
      mockSearchStore.searchOpen = true
      mockSearchStore.searchQuery = 'synced query'
      
      render(<SearchBar />)
      
      const input = screen.getByRole('textbox')
      // The component syncs the query to local state when searchOpen is true
      expect(input).toHaveValue('synced query')
    })
  })

  describe('Edge Cases', () => {
    it('should handle disabled state when searching', () => {
      mockSearchStore.searchOpen = true
      mockSearchStore.isSearching = true
      
      render(<SearchBar />)
      
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('should not show clear button when input is empty', () => {
      mockSearchStore.searchOpen = true
      
      render(<SearchBar />)
      
      // X button should not be present when input is empty
      expect(screen.queryByTitle('清除')).not.toBeInTheDocument()
    })

    it('should handle empty search mode gracefully', () => {
      mockSearchStore.searchOpen = true
      mockSearchStore.searchMode = '' as any // Invalid mode
      
      render(<SearchBar />)
      
      // Should fallback to '全部'
      expect(screen.getByText('全部')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<SearchBar />)
      
      const searchButton = screen.getByRole('button', { name: /搜索/ })
      expect(searchButton).toHaveAttribute('title', '搜索 (⌘K)')
    })

    it('should provide keyboard shortcut hint', () => {
      render(<SearchBar />)
      
      expect(screen.getByText('⌘K')).toBeInTheDocument()
    })

    it('should have accessible input when open', () => {
      mockSearchStore.searchOpen = true
      
      render(<SearchBar />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('placeholder')
    })

    it('should have proper button titles when open', () => {
      mockSearchStore.searchOpen = true
      
      render(<SearchBar />)
      
      expect(screen.getByTitle('搜索模式')).toBeInTheDocument()
      expect(screen.getByTitle('关闭 (ESC)')).toBeInTheDocument()
    })
  })

  describe('Focus Management', () => {
    it('should focus input when search opens', async () => {
      mockSearchStore.searchOpen = true
      
      render(<SearchBar />)
      
      // Wait for focus effect
      await waitFor(() => {
        const input = screen.getByRole('textbox')
        expect(document.activeElement).toBe(input)
      })
    })
  })

  describe('Integrated Search Results', () => {
    beforeEach(() => {
      mockSearchStore.searchOpen = true
    })

    it('should show search results dropdown when open with results', () => {
      mockSearchStore.searchQuery = 'test'
      mockSearchStore.searchResults = [
        {
          id: 'result-1',
          projectId: 'project-1',
          projectName: 'Test Project',
          matchType: 'content' as const,
          context: 'test content',
          highlightPositions: [[0, 4]] as [number, number][],
          score: 85,
          timestamp: new Date()
        }
      ]
      mockSearchStore.totalResults = 1
      
      render(<SearchBar />)
      
      expect(screen.getByText('搜索结果 (1)')).toBeInTheDocument()
      expect(screen.getByText('Test Project')).toBeInTheDocument()
      expect(screen.getByText('内容')).toBeInTheDocument()
    })

    it('should show search history when no query', () => {
      mockSearchStore.searchHistory = [
        { id: 1, query: 'previous search', timestamp: new Date(), resultCount: 3 }
      ]
      
      render(<SearchBar />)
      
      expect(screen.getByText('搜索历史')).toBeInTheDocument()
      expect(screen.getByText('previous search')).toBeInTheDocument()
      expect(screen.getByText('清除历史')).toBeInTheDocument()
    })

    it('should show empty state when no query and no history', () => {
      render(<SearchBar />)
      
      expect(screen.getByText('开始输入以搜索项目、版本或内容')).toBeInTheDocument()
      expect(screen.getByText('使用 ⌘K 快速打开搜索')).toBeInTheDocument()
    })

    it('should handle result click and navigate', async () => {
      mockSearchStore.searchQuery = 'test'
      mockSearchStore.searchResults = [
        {
          id: 'result-1',
          projectId: 'project-1',
          projectName: 'Test Project',
          versionNumber: 1,
          matchType: 'content' as const,
          context: 'test content',
          highlightPositions: [],
          score: 85,
          timestamp: new Date()
        }
      ]
      
      render(<SearchBar />)
      
      const resultButton = screen.getByText('Test Project').closest('button')!
      fireEvent.click(resultButton)
      
      expect(mockProjectStore.selectProject).toHaveBeenCalledWith('project-1')
      expect(mockVersionStore.setCurrentVersionNumber).toHaveBeenCalledWith(1)
      expect(mockSearchStore.closeSearch).toHaveBeenCalledTimes(1)
    })

    it('should handle history item click', () => {
      mockSearchStore.searchHistory = [
        { id: 1, query: 'previous search', timestamp: new Date(), resultCount: 3 }
      ]
      
      render(<SearchBar />)
      
      const historyButton = screen.getByText('previous search')
      fireEvent.click(historyButton)
      
      expect(mockSearchStore.search).toHaveBeenCalledWith('previous search')
    })
  })

  describe('Component Integration', () => {
    it('should render all expected elements when open', () => {
      mockSearchStore.searchOpen = true
      
      render(<SearchBar />)
      
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByText('全部')).toBeInTheDocument() // Mode button
      expect(screen.getByText('ESC')).toBeInTheDocument() // Close button
    })

    it('should handle mode changes correctly', () => {
      mockSearchStore.searchOpen = true
      
      const { rerender } = render(<SearchBar />)
      
      expect(screen.getByText('全部')).toBeInTheDocument()
      
      // Change mode
      mockSearchStore.searchMode = 'content'
      rerender(<SearchBar />)
      
      expect(screen.getByText('内容')).toBeInTheDocument()
    })

    it('should handle search state changes', () => {
      mockSearchStore.searchOpen = true
      
      const { rerender } = render(<SearchBar />)
      
      expect(screen.getByRole('textbox')).not.toBeDisabled()
      
      // Start searching
      mockSearchStore.isSearching = true
      rerender(<SearchBar />)
      
      expect(screen.getByRole('textbox')).toBeDisabled()
      expect(screen.getByPlaceholderText('搜索中...')).toBeInTheDocument()
    })
  })

  describe('Chinese Input Support', () => {
    beforeEach(() => {
      mockSearchStore.searchOpen = true
    })

    it('should handle composition start and prevent search during composition', async () => {
      render(<SearchBar />)
      const input = screen.getByRole('textbox')

      // Simulate Chinese input composition start
      fireEvent.compositionStart(input)
      fireEvent.change(input, { target: { value: '中' } })

      // Search should not be triggered during composition
      expect(mockSearchStore.search).not.toHaveBeenCalled()
    })

    it('should trigger search after composition ends', async () => {
      render(<SearchBar />)
      const input = screen.getByRole('textbox')

      // Simulate complete Chinese input
      fireEvent.compositionStart(input)
      fireEvent.change(input, { target: { value: '中文' } })
      fireEvent.compositionEnd(input)

      // Wait for debounced search
      await waitFor(() => {
        expect(mockSearchStore.search).toHaveBeenCalledWith('中文')
      })
    })

    it('should not lose focus during composition', async () => {
      render(<SearchBar />)
      const input = screen.getByRole('textbox')
      
      // Focus input
      input.focus()
      expect(document.activeElement).toBe(input)

      // Start composition
      fireEvent.compositionStart(input)
      fireEvent.change(input, { target: { value: '拼' } })
      
      // Should still be focused
      expect(document.activeElement).toBe(input)

      // End composition
      fireEvent.compositionEnd(input)
      
      // Should still be focused
      expect(document.activeElement).toBe(input)
    })

    it('should allow delete/backspace during typing', async () => {
      const user = userEvent.setup()
      render(<SearchBar />)
      const input = screen.getByRole('textbox')

      // Type some text
      await user.type(input, 'hello world')
      expect(input).toHaveValue('hello world')

      // Use backspace to delete characters
      await user.type(input, '{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}')
      expect(input).toHaveValue('hello ')

      // Continue with backspace
      await user.type(input, '{Backspace}')
      expect(input).toHaveValue('hello')

      // Verify that input is still functional after deletion
      await user.type(input, ' test')
      expect(input).toHaveValue('hello test')
    })

    it('should handle mixed Chinese and English input', async () => {
      render(<SearchBar />)
      const input = screen.getByRole('textbox')

      // Start with English
      fireEvent.change(input, { target: { value: 'hello' } })

      // Add Chinese with composition
      fireEvent.compositionStart(input)
      fireEvent.change(input, { target: { value: 'hello中文' } })
      fireEvent.compositionEnd(input)

      // Add more English
      fireEvent.change(input, { target: { value: 'hello中文test' } })

      await waitFor(() => {
        expect(mockSearchStore.search).toHaveBeenCalledWith('hello中文test')
      })
    })
  })
})
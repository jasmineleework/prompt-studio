import { create } from 'zustand'
import { getDB } from './database'
import { Project, Version } from '@/types'

export type SearchMode = 'all' | 'title' | 'content' | 'description'

export interface SearchResult {
  id: string
  projectId: string
  projectName: string
  versionId?: string
  versionNumber?: number
  versionDescription?: string
  matchType: 'title' | 'content' | 'description'
  matchedText: string
  context: string
  highlightPositions: [number, number][]
  score: number
  timestamp: Date
}

export interface SearchHistoryItem {
  id?: number
  query: string
  timestamp: Date
  resultCount: number
}

interface SearchState {
  // 搜索状态
  searchQuery: string
  searchMode: SearchMode
  isSearching: boolean
  searchOpen: boolean
  
  // 搜索结果
  searchResults: SearchResult[]
  totalResults: number
  currentPage: number
  resultsPerPage: number
  
  // 搜索历史
  searchHistory: SearchHistoryItem[]
  
  // 方法
  search: (query: string) => Promise<void>
  setSearchMode: (mode: SearchMode) => void
  clearSearch: () => void
  openSearch: () => void
  closeSearch: () => void
  loadSearchHistory: () => Promise<void>
  clearSearchHistory: () => Promise<void>
  addToHistory: (query: string, resultCount: number) => Promise<void>
}

// 简单的中文分词函数
function tokenizeText(text: string): string[] {
  // 转换为小写
  const lowerText = text.toLowerCase()
  
  // 提取中文词组（2-4字）
  const chineseWords: string[] = []
  const chineseRegex = /[\u4e00-\u9fa5]+/g
  let match
  while ((match = chineseRegex.exec(lowerText)) !== null) {
    const word = match[0]
    // 生成2-4字的词组
    for (let len = 2; len <= 4 && len <= word.length; len++) {
      for (let i = 0; i <= word.length - len; i++) {
        chineseWords.push(word.substring(i, i + len))
      }
    }
  }
  
  // 提取英文单词
  const englishWords = lowerText.match(/[a-z0-9]+/g) || []
  
  return Array.from(new Set([...chineseWords, ...englishWords]))
}

// 计算相关度分数
function calculateRelevanceScore(
  query: string,
  matchType: 'title' | 'content' | 'description',
  matchedText: string,
  timestamp: Date
): number {
  let score = 0
  const lowerQuery = query.toLowerCase()
  const lowerText = matchedText.toLowerCase()
  
  // 匹配类型权重
  if (matchType === 'title') score += 50
  else if (matchType === 'description') score += 30
  else score += 20
  
  // 完全匹配加分
  if (lowerText.includes(lowerQuery)) score += 30
  
  // 位置权重
  const position = lowerText.indexOf(lowerQuery)
  if (position >= 0) {
    score += Math.max(0, 20 - position / 50)
  }
  
  // 时间权重
  const daysSinceUpdate = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24)
  score += Math.max(0, 10 - daysSinceUpdate / 30)
  
  return Math.min(score, 100)
}

// 获取匹配上下文
function getMatchContext(text: string, query: string, contextLength: number = 50): string {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)
  
  if (index === -1) return text.substring(0, contextLength * 2)
  
  const start = Math.max(0, index - contextLength)
  const end = Math.min(text.length, index + query.length + contextLength)
  
  let context = text.substring(start, end)
  if (start > 0) context = '...' + context
  if (end < text.length) context = context + '...'
  
  return context
}

// 获取高亮位置
function getHighlightPositions(text: string, query: string): [number, number][] {
  const positions: [number, number][] = []
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  
  let index = 0
  while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
    positions.push([index, index + query.length])
    index += query.length
  }
  
  return positions
}

export const useSearchStore = create<SearchState>((set, get) => ({
  // 初始状态
  searchQuery: '',
  searchMode: 'all',
  isSearching: false,
  searchOpen: false,
  searchResults: [],
  totalResults: 0,
  currentPage: 1,
  resultsPerPage: 20,
  searchHistory: [],
  
  // 执行搜索
  search: async (query: string) => {
    // 更新查询状态
    set({ searchQuery: query })
    
    if (!query.trim()) {
      set({ searchResults: [], totalResults: 0, isSearching: false })
      return
    }
    
    set({ isSearching: true })
    
    try {
      const db = await getDB()
      const results: SearchResult[] = []
      
      // 获取所有项目和版本
      const projects = await db.getAll('projects')
      const versions = await db.getAll('versions')
      
      const { searchMode } = get()
      const lowerQuery = query.toLowerCase()
      
      // 搜索项目名称
      if (searchMode === 'all' || searchMode === 'title') {
        projects.forEach(project => {
          if (project.name.toLowerCase().includes(lowerQuery)) {
            results.push({
              id: `project-${project.id}`,
              projectId: project.id,
              projectName: project.name,
              matchType: 'title',
              matchedText: project.name,
              context: project.description || '',
              highlightPositions: getHighlightPositions(project.name, query),
              score: calculateRelevanceScore(query, 'title', project.name, project.metadata.updatedAt),
              timestamp: project.metadata.updatedAt
            })
          }
        })
      }
      
      // 搜索版本内容和描述
      if (searchMode === 'all' || searchMode === 'content' || searchMode === 'description') {
        for (const version of versions) {
          const project = projects.find(p => p.id === version.projectId)
          if (!project) continue
          
          // 搜索版本描述
          if ((searchMode === 'all' || searchMode === 'description') && 
              version.description?.toLowerCase().includes(lowerQuery)) {
            results.push({
              id: `version-desc-${version.id}`,
              projectId: project.id,
              projectName: project.name,
              versionId: version.id,
              versionNumber: version.versionNumber,
              versionDescription: version.description,
              matchType: 'description',
              matchedText: version.description || '',
              context: version.description || '',
              highlightPositions: getHighlightPositions(version.description || '', query),
              score: calculateRelevanceScore(query, 'description', version.description || '', version.timestamp),
              timestamp: version.timestamp
            })
          }
          
          // 搜索版本内容
          if ((searchMode === 'all' || searchMode === 'content') && 
              version.content.toLowerCase().includes(lowerQuery)) {
            results.push({
              id: `version-content-${version.id}`,
              projectId: project.id,
              projectName: project.name,
              versionId: version.id,
              versionNumber: version.versionNumber,
              versionDescription: version.description,
              matchType: 'content',
              matchedText: version.content,
              context: getMatchContext(version.content, query),
              highlightPositions: getHighlightPositions(getMatchContext(version.content, query, 100), query),
              score: calculateRelevanceScore(query, 'content', version.content, version.timestamp),
              timestamp: version.timestamp
            })
          }
        }
      }
      
      // 按分数排序
      results.sort((a, b) => b.score - a.score)
      
      // 添加到搜索历史
      if (results.length > 0) {
        await get().addToHistory(query, results.length)
      }
      
      set({
        searchResults: results.slice(0, get().resultsPerPage),
        totalResults: results.length,
        isSearching: false
      })
    } catch (error) {
      console.error('Search failed:', error)
      set({ isSearching: false, searchResults: [], totalResults: 0 })
    }
  },
  
  // 设置搜索模式
  setSearchMode: (mode: SearchMode) => {
    set({ searchMode: mode })
    const { searchQuery } = get()
    if (searchQuery) {
      get().search(searchQuery)
    }
  },
  
  // 清空搜索
  clearSearch: () => {
    set({
      searchQuery: '',
      searchResults: [],
      totalResults: 0,
      currentPage: 1
    })
  },
  
  // 打开搜索
  openSearch: () => {
    set({ searchOpen: true })
    get().loadSearchHistory()
  },
  
  // 关闭搜索
  closeSearch: () => {
    set({ searchOpen: false })
  },
  
  // 加载搜索历史
  loadSearchHistory: async () => {
    try {
      const db = await getDB()
      const history = await db.getAll('searchHistory')
      // 按时间倒序，只取最近10条
      history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      set({ searchHistory: history.slice(0, 10) })
    } catch (error) {
      console.error('Failed to load search history:', error)
    }
  },
  
  // 清空搜索历史
  clearSearchHistory: async () => {
    try {
      const db = await getDB()
      const tx = db.transaction('searchHistory', 'readwrite')
      const store = tx.objectStore('searchHistory')
      await store.clear()
      await tx.done
      set({ searchHistory: [] })
    } catch (error) {
      console.error('Failed to clear search history:', error)
    }
  },
  
  // 添加到搜索历史
  addToHistory: async (query: string, resultCount: number) => {
    try {
      const db = await getDB()
      const historyItem: SearchHistoryItem = {
        query,
        timestamp: new Date(),
        resultCount
      }
      await db.add('searchHistory', historyItem)
      // 更新内存中的历史记录
      const history = [...get().searchHistory, historyItem]
      history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      set({ searchHistory: history.slice(0, 10) })
    } catch (error) {
      console.error('Failed to add to search history:', error)
    }
  }
}))
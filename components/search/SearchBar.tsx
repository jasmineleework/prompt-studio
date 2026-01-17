'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Filter, FileText, Hash, MessageSquare, Clock, ChevronRight } from 'lucide-react'
import { useSearchStore, SearchMode, SearchResult } from '@/lib/stores/searchStore'
import { useProjectStore } from '@/lib/stores/projectStore'
import { useVersionStore } from '@/lib/stores/versionStore'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'

export function SearchBar() {
  const { 
    searchQuery, 
    searchMode, 
    isSearching,
    searchOpen,
    searchResults,
    totalResults,
    searchHistory,
    openSearch,
    closeSearch,
    search,
    setSearchMode,
    clearSearch,
    clearSearchHistory
  } = useSearchStore()
  
  const { selectProject } = useProjectStore()
  const { setCurrentVersionNumber } = useVersionStore()
  
  const [localQuery, setLocalQuery] = useState('')
  const [showModeMenu, setShowModeMenu] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(localQuery, 300)

  // 同步全局搜索状态到本地状态 (只在打开时同步一次)
  useEffect(() => {
    if (searchOpen && searchQuery !== localQuery) {
      setLocalQuery(searchQuery)
    }
  }, [searchOpen]) // 移除searchQuery和localQuery依赖，避免循环

  // 修复：当搜索完成后，自动恢复输入框焦点
  // 解决 disabled={isSearching} 导致的焦点丢失问题
  useEffect(() => {
    if (!isSearching && searchOpen && inputRef.current) {
      requestAnimationFrame(() => {
        if (inputRef.current && searchOpen) {
          inputRef.current.focus()
        }
      })
    }
  }, [isSearching, searchOpen])

  // 优化的搜索函数
  const handleSearch = useCallback((query: string) => {
    if (query !== searchQuery) {
      search(query)
    }
  }, [search, searchQuery])

  // 执行搜索 (添加防抖、条件检查和中文输入法支持)
  useEffect(() => {
    if (debouncedQuery && debouncedQuery !== searchQuery && !isComposing) {
      handleSearch(debouncedQuery)
    }
  }, [debouncedQuery, handleSearch, searchQuery, isComposing])

  // 搜索框打开时自动获得焦点
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      // 延迟足够的时间确保DOM完全渲染和状态稳定
      const timeoutId = setTimeout(() => {
        if (inputRef.current && searchOpen) { // 双重检查
          inputRef.current.focus()
        }
      }, 100) // 增加延迟时间
      return () => clearTimeout(timeoutId)
    }
  }, [searchOpen])

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      // 找到最外层的搜索容器
      const searchContainer = inputRef.current?.closest('[data-search-container]')
      
      // 如果点击的不是搜索容器内部，则关闭搜索
      if (searchOpen && target && searchContainer && !searchContainer.contains(target) && 
          resultsRef.current && !resultsRef.current.contains(target)) {
        closeSearch()
      }
    }

    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [searchOpen, closeSearch])

  // 处理快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框内，优先处理输入框内的编辑操作
      if (inputRef.current && document.activeElement === inputRef.current) {
        // 只处理ESC键，其他键让输入框原生处理
        if (e.key === 'Escape') {
          e.preventDefault()
          closeSearch()
          setLocalQuery('')
          setIsComposing(false)
        }
        // 不拦截Delete、Backspace等编辑键
        return
      }

      // Cmd/Ctrl + K 打开/关闭搜索
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!searchOpen) {
          openSearch()
        } else {
          closeSearch()
        }
      }
      // ESC 关闭搜索
      if (e.key === 'Escape' && searchOpen) {
        closeSearch()
        setIsComposing(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen, openSearch, closeSearch])

  const handleClear = () => {
    setLocalQuery('')
    clearSearch()
    // 清除后重新获得焦点
    inputRef.current?.focus()
  }

  const handleClose = () => {
    setLocalQuery('')
    setShowModeMenu(false)
    setIsComposing(false)
    closeSearch()
  }

  // 处理中文输入法composition事件
  const handleCompositionStart = () => {
    setIsComposing(true)
  }

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false)
    // composition结束后，如果有内容且与当前搜索不同，立即触发搜索
    const currentValue = inputRef.current?.value || ''
    if (currentValue && currentValue !== searchQuery) {
      // 延迟一点时间确保composition完全结束
      setTimeout(() => {
        if (!isComposing && currentValue === localQuery) {
          handleSearch(currentValue)
        }
      }, 10)
    }
  }, [searchQuery, localQuery, handleSearch, isComposing])

  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode)
    setShowModeMenu(false)
  }

  const getModeLabel = (mode: SearchMode) => {
    switch (mode) {
      case 'all':
        return '全部'
      case 'title':
        return '标题'
      case 'content':
        return '内容'
      case 'description':
        return '描述'
      default:
        return '全部'
    }
  }

  // 处理搜索结果点击
  const handleResultClick = async (result: SearchResult) => {
    try {
      selectProject(result.projectId)
      if (result.versionNumber) {
        setCurrentVersionNumber(result.versionNumber)
      }
      handleClose()
    } catch (error) {
      console.error('Failed to navigate to result:', error)
    }
  }

  // 处理历史记录点击
  const handleHistoryClick = (query: string) => {
    setLocalQuery(query)
    search(query)
  }

  // 获取匹配类型图标
  const getMatchTypeIcon = (matchType: 'title' | 'content' | 'description') => {
    switch (matchType) {
      case 'title':
        return <FileText className="h-4 w-4" />
      case 'content':
        return <Hash className="h-4 w-4" />
      case 'description':
        return <MessageSquare className="h-4 w-4" />
    }
  }

  // 获取匹配类型标签
  const getMatchTypeLabel = (matchType: 'title' | 'content' | 'description') => {
    switch (matchType) {
      case 'title':
        return '项目名称'
      case 'content':
        return '内容'
      case 'description':
        return '版本描述'
    }
  }

  // 高亮搜索关键词
  const highlightText = (text: string, positions: [number, number][]) => {
    if (!positions || positions.length === 0) return text

    const parts: JSX.Element[] = []
    let lastEnd = 0

    positions.forEach(([start, end], index) => {
      if (start > lastEnd) {
        parts.push(<span key={`normal-${index}`}>{text.substring(lastEnd, start)}</span>)
      }
      parts.push(
        <mark key={`highlight-${index}`} className="bg-yellow-500/30 text-yellow-200">
          {text.substring(start, end)}
        </mark>
      )
      lastEnd = end
    })

    if (lastEnd < text.length) {
      parts.push(<span key="normal-last">{text.substring(lastEnd)}</span>)
    }

    return <>{parts}</>
  }

  if (!searchOpen) {
    return (
      <button
        onClick={openSearch}
        className="flex items-center gap-2.5 px-4 py-2 text-sm rounded-lg border border-border-subtle hover:bg-background-hover hover:border-border-hover hover:shadow-sm transition-all group"
        title="搜索 (⌘K)"
      >
        <Search className="h-4 w-4 text-foreground-muted group-hover:text-primary transition-colors" />
        <span className="font-medium text-foreground-muted group-hover:text-foreground transition-colors">搜索</span>
        <kbd className="ml-2 px-2 py-1 text-xs bg-background-elevated border border-border rounded-md font-mono text-foreground-muted">⌘K</kbd>
      </button>
    )
  }

  return (
    <div className="relative" data-search-container>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-background border border-border-hover rounded-lg focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <Search className={cn(
          "h-4 w-4 flex-shrink-0",
          isSearching ? "text-primary animate-pulse" : "text-muted-foreground"
        )} />
        
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => {
            setLocalQuery(e.target.value)
          }}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={isSearching ? "搜索中..." : "搜索项目、版本或内容..."}
          className="flex-1 min-w-[200px] bg-transparent text-sm outline-none placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          disabled={isSearching}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              handleClose()
            }
          }}
        />

        <div className="relative">
          <button
            onClick={() => setShowModeMenu(!showModeMenu)}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-accent hover:text-accent-foreground"
            title="搜索模式"
          >
            <Filter className="h-3 w-3" />
            <span>{getModeLabel(searchMode)}</span>
          </button>

          {showModeMenu && (
            <div className="absolute top-full right-0 mt-1 py-1 bg-popover border border-border rounded shadow-md z-[60]" data-testid="search-mode-menu">
              {(['all', 'title', 'content', 'description'] as SearchMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={cn(
                    "block w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    searchMode === mode && "bg-accent text-accent-foreground"
                  )}
                >
                  {getModeLabel(mode)}
                </button>
              ))}
            </div>
          )}
        </div>

        {localQuery && (
          <button
            onClick={handleClear}
            className="p-1 rounded hover:bg-accent hover:text-accent-foreground"
            title="清除"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        <button
          onClick={handleClose}
          className="ml-1 px-2 py-1 text-xs rounded hover:bg-accent hover:text-accent-foreground"
          title="关闭 (ESC)"
        >
          ESC
        </button>
      </div>

      {/* 搜索结果下拉面板 */}
      {searchOpen && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-surface-raised border border-border-strong rounded-xl shadow-xl z-50 overflow-hidden"
          style={{ maxHeight: '500px', minWidth: '400px' }}
        >
          {/* 搜索结果 */}
          {searchQuery && (
            <div className="border-b border-border">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <h3 className="text-sm font-medium text-muted-foreground">
                  搜索结果 {totalResults > 0 && `(${totalResults})`}
                </h3>
                {isSearching && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-label="正在搜索">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                    <span>搜索中...</span>
                  </div>
                )}
              </div>

              {searchResults.length > 0 ? (
                <div className="max-h-[350px] overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left p-4 border-b border-border/50 last:border-b-0 hover:bg-accent/50 group transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-muted-foreground">
                          {getMatchTypeIcon(result.matchType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">
                              {result.projectName}
                            </span>
                            {result.versionNumber && (
                              <span className="text-xs text-muted-foreground">
                                v{result.versionNumber}
                              </span>
                            )}
                            <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                              {getMatchTypeLabel(result.matchType)}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {highlightText(result.context, result.highlightPositions)}
                          </div>
                          {result.versionDescription && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {result.versionDescription}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : !isSearching && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">没有找到相关结果</p>
                </div>
              )}
            </div>
          )}

          {/* 搜索历史 */}
          {!searchQuery && searchHistory.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">搜索历史</h3>
                <button
                  onClick={clearSearchHistory}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  清除历史
                </button>
              </div>
              <div className="space-y-1">
                {searchHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryClick(item.query)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="flex-1 text-left truncate">{item.query}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.resultCount} 结果
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 空状态 */}
          {!searchQuery && searchHistory.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-sm mb-2 font-medium">开始输入以搜索项目、版本或内容</p>
              <p className="text-xs opacity-70">使用 ⌘K 快速打开搜索</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
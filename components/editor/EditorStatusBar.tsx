'use client'

import { useMemo } from 'react'
import { FileText, Hash, Type, Cpu } from 'lucide-react'

interface EditorStatusBarProps {
  content: string
}

export function EditorStatusBar({ content }: EditorStatusBarProps) {
  const stats = useMemo(() => {
    const lines = content.split('\n').length
    const characters = content.length
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length
    // 估算token数 (OpenAI的经验值：英文约4个字符1个token，中文约2个字符1个token)
    // 这里使用保守估算：字符数/3
    const estimatedTokens = Math.ceil(characters / 3)
    
    return {
      lines,
      characters,
      words,
      estimatedTokens
    }
  }, [content])

  return (
    <div className="h-9 border-t border-border-subtle bg-surface flex items-center justify-between px-6 text-xs shadow-sm">
      <div className="flex items-center gap-6">
        {/* 行数 */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-background-hover transition-colors cursor-default">
          <FileText className="h-3.5 w-3.5 text-accent-blue" />
          <span className="font-medium text-foreground-muted">{stats.lines}</span>
          <span className="text-foreground-subtle">行</span>
        </div>

        {/* 字符数 */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-background-hover transition-colors cursor-default">
          <Type className="h-3.5 w-3.5 text-accent-purple" />
          <span className="font-medium text-foreground-muted">{stats.characters.toLocaleString()}</span>
          <span className="text-foreground-subtle">字符</span>
        </div>

        {/* 字数 */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-background-hover transition-colors cursor-default">
          <Hash className="h-3.5 w-3.5 text-accent-amber" />
          <span className="font-medium text-foreground-muted">{stats.words.toLocaleString()}</span>
          <span className="text-foreground-subtle">字</span>
        </div>

        {/* Token估算 */}
        <div className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors cursor-default ${
          stats.estimatedTokens > 8000 ? "bg-red-500/10" :
          stats.estimatedTokens > 4000 ? "bg-orange-500/10" :
          "hover:bg-background-hover"
        }`}>
          <Cpu className={`h-3.5 w-3.5 ${
            stats.estimatedTokens > 8000 ? "text-red-500" :
            stats.estimatedTokens > 4000 ? "text-orange-500" :
            "text-accent-green"
          }`} />
          <span className={`font-medium ${
            stats.estimatedTokens > 8000 ? "text-red-500" :
            stats.estimatedTokens > 4000 ? "text-orange-500" :
            "text-foreground-muted"
          }`}>
            ~{stats.estimatedTokens.toLocaleString()}
          </span>
          <span className={
            stats.estimatedTokens > 8000 ? "text-red-500" :
            stats.estimatedTokens > 4000 ? "text-orange-500" :
            "text-foreground-subtle"
          }>
            tokens
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Token限制警告 */}
        {stats.estimatedTokens > 4000 && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
            stats.estimatedTokens > 8000
              ? "bg-red-500/15 text-red-500 border border-red-500/20"
              : "bg-orange-500/15 text-orange-500 border border-orange-500/20"
          }`}>
            <span>⚠️</span>
            <span>
              {stats.estimatedTokens > 8000 ? "超过 8K tokens" : "超过 4K tokens"}
            </span>
          </div>
        )}

        {/* 编码信息 */}
        <span className="text-foreground-subtle font-medium px-2 py-1 rounded-md bg-background-elevated">
          UTF-8
        </span>
      </div>
    </div>
  )
}
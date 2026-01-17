'use client'

import { useState, useEffect } from 'react'
import { ProjectPanel } from '@/components/project/ProjectPanel'
import { PromptEditor } from '@/components/editor/PromptEditor'
import { useProjectStore } from '@/lib/stores/projectStore'

export default function Home() {
  const { loadProjects } = useProjectStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProjects().then(() => {
      setIsLoading(false)
    })
  }, [loadProjects])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-elevated">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-full border-4 border-border opacity-20"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          </div>
          <p className="mt-6 text-sm text-foreground-muted font-medium">Loading workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background-elevated">
      {/* Left Sidebar - 项目管理 */}
      <div className="w-64 border-r border-border-subtle bg-surface flex flex-col shadow-sm">
        <ProjectPanel />
      </div>

      {/* Main Content - 编辑器 */}
      <div className="flex-1 overflow-hidden bg-background">
        <PromptEditor />
      </div>
    </div>
  )
}

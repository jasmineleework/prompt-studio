'use client'

import { useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { useProjectStore } from '@/lib/stores/projectStore'
import { useVersionStore } from '@/lib/stores/versionStore'
import { useEditorStore } from '@/lib/stores/editorStore'
import { EditorToolbar } from './EditorToolbar'
import { EditorStatusBar } from './EditorStatusBar'

export function PromptEditor() {
  const { currentProject } = useProjectStore()
  const { currentVersion, loadVersions, isLoading } = useVersionStore()
  const { content, setContent, loadContent } = useEditorStore()
  const editorRef = useRef<any>(null)

  // Load versions when project changes
  useEffect(() => {
    if (currentProject) {
      loadVersions(currentProject.id)
    }
  }, [currentProject, loadVersions])

  // Update content when version changes or when there's no version
  useEffect(() => {
    if (currentVersion) {
      loadContent(currentVersion.content)
    } else if (currentProject && !isLoading) {
      // 如果项目存在但没有版本（新项目），清空编辑器
      loadContent('')
    }
  }, [currentVersion, currentProject, isLoading, loadContent])

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value)
    }
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center max-w-md px-6">
          <div className="inline-flex p-5 rounded-2xl bg-primary/10 mb-6">
            <svg className="h-16 w-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">未选择项目</h2>
          <p className="text-sm text-foreground-muted leading-relaxed">
            从左侧边栏创建新项目或选择现有项目以开始编辑
          </p>
        </div>
      </div>
    )
  }

  // Show loading state while versions are being loaded
  if (isLoading && !currentVersion) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-border opacity-20"></div>
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
          </div>
          <p className="text-sm text-foreground-muted font-medium">加载版本中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <EditorToolbar />
      <div className="flex-1 relative flex flex-col">
        <div className="flex-1 border-t border-border-subtle">
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={content}
            theme="vs-dark"
            loading={
              <div className="flex items-center justify-center h-full bg-background">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                  <p className="mt-3 text-xs text-foreground-muted">Loading editor...</p>
                </div>
              </div>
            }
            onChange={handleEditorChange}
            onMount={(editor) => {
              editorRef.current = editor
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'Sarasa Mono SC', 'SF Mono', 'Menlo', 'Consolas', 'Courier New', monospace",
              lineHeight: 22,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'none',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 16, bottom: 16 },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
            }}
          />
        </div>
        <EditorStatusBar content={content} />
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { Save, Undo, Redo, FileText, Download } from 'lucide-react'
import ReactDiffViewer from 'react-diff-viewer-continued'
import { useProjectStore } from '@/lib/stores/projectStore'
import { useVersionStore } from '@/lib/stores/versionStore'
import { useEditorStore } from '@/lib/stores/editorStore'
import { useSearchStore } from '@/lib/stores/searchStore'
import { VersionSelector } from '@/components/version/VersionSelector'
import { SearchBar } from '@/components/search/SearchBar'
import { cn } from '@/lib/utils'

export function EditorToolbar() {
  const { currentProject } = useProjectStore()
  const { currentVersion, createVersion } = useVersionStore()
  const { content, hasUnsavedChanges, markAsSaved, discardChanges } = useEditorStore()
  const [isSaving, setIsSaving] = useState(false)
  const [showDiffDialog, setShowDiffDialog] = useState(false)
  const [versionDescription, setVersionDescription] = useState('快速保存')

  const handleOpenDiffDialog = () => {
    if (!currentProject || !hasUnsavedChanges) return
    setVersionDescription('快速保存')
    setShowDiffDialog(true)
  }

  const handleConfirmSave = async () => {
    if (!currentProject) return
    
    setIsSaving(true)
    setShowDiffDialog(false)
    try {
      await createVersion(
        currentProject.id, 
        content, 
        versionDescription || '快速保存',
        currentProject.name
      )
      markAsSaved()
      setVersionDescription('快速保存')
      setTimeout(() => {
        setIsSaving(false)
      }, 500)
    } catch (error) {
      console.error('Failed to save:', error)
      setIsSaving(false)
    }
  }

  const handleCancelSave = () => {
    setShowDiffDialog(false)
    setVersionDescription('快速保存')
  }

  const handleUndo = () => {
    console.log('Undo')
  }

  const handleRedo = () => {
    console.log('Redo')
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentProject?.name || 'prompt'}_v${currentVersion?.versionNumber || 1}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 获取上一个版本的内容
  const previousContent = currentVersion?.content || ''

  return (
    <>
      <div className="h-14 border-b border-border-subtle flex items-center justify-between px-6 bg-surface shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-background-elevated">
            <FileText className="h-4 w-4 text-accent-blue" />
            <span className="text-sm font-semibold">
              {currentProject?.name || '未选择项目'}
            </span>
          </div>

          <div className="w-px h-6 bg-border" />

          <VersionSelector />

          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-xs text-orange-500 font-medium">未保存</span>
            </div>
          )}

          {isSaving && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-500 font-medium">保存中...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* 搜索功能 */}
          <SearchBar />

          <div className="w-px h-6 bg-border" />

          {/* 保存按钮 */}
          <button
            onClick={handleOpenDiffDialog}
            disabled={!hasUnsavedChanges || isSaving}
            className={cn(
              "px-4 py-2 text-sm rounded-lg flex items-center gap-2 font-medium transition-all",
              hasUnsavedChanges
                ? "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow-md"
                : "bg-background-elevated text-foreground-muted border border-border cursor-not-allowed opacity-50"
            )}
            title="保存版本"
          >
            <Save className="h-4 w-4" />
            保存
          </button>

          <div className="w-px h-6 bg-border" />

          {/* 次要操作组 */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-background-elevated border border-border-subtle">
            <button
              onClick={handleDownload}
              disabled={!content}
              className={cn(
                "p-2 text-sm rounded-md transition-all",
                content
                  ? "hover:bg-background-hover hover:text-foreground"
                  : "opacity-40 cursor-not-allowed"
              )}
              title="下载为 Markdown"
            >
              <Download className="h-4 w-4" />
            </button>

            <div className="w-px h-4 bg-border" />

            <button
              onClick={handleUndo}
              className="p-2 text-sm rounded-md hover:bg-background-hover hover:text-foreground transition-all"
              title="撤销 (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </button>

            <button
              onClick={handleRedo}
              className="p-2 text-sm rounded-md hover:bg-background-hover hover:text-foreground transition-all"
              title="重做 (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </button>
          </div>

          {hasUnsavedChanges && (
            <>
              <div className="w-px h-6 bg-border" />
              <button
                onClick={discardChanges}
                className="px-3 py-2 text-sm rounded-lg text-destructive hover:bg-destructive/10 transition-colors font-medium"
                title="放弃更改"
              >
                放弃更改
              </button>
            </>
          )}
        </div>
      </div>

      {/* 差异对比+描述对话框 */}
      {showDiffDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-surface-raised border border-border-strong rounded-xl flex flex-col shadow-2xl animate-scale-in" style={{ width: '90vw', height: '80vh' }}>
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-background-elevated rounded-t-xl">
              <div>
                <h3 className="text-lg font-semibold text-foreground">版本差异对比</h3>
                <p className="text-sm text-foreground-muted mt-0.5">审查更改后保存</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-foreground-muted px-3 py-1.5 rounded-lg bg-background border border-border">
                  v{currentVersion?.versionNumber || 0} → v{(currentVersion?.versionNumber || 0) + 1}
                </div>
              </div>
            </div>

            {/* 差异对比区域 */}
            <div className="flex-1 overflow-auto bg-background p-4">
              <div className="rounded-lg overflow-hidden border border-border-subtle shadow-inner">
                <ReactDiffViewer
                  oldValue={previousContent}
                  newValue={content}
                  splitView={true}
                  useDarkTheme={true}
                  leftTitle={`v${currentVersion?.versionNumber || 0} (上一版本)`}
                  rightTitle="当前编辑内容"
                  styles={{
                    variables: {
                      dark: {
                        diffViewerBackground: '#1a1a2e',
                        diffViewerColor: '#e4e4e7',
                        gutterBackground: '#252538',
                        gutterColor: '#a1a1aa',
                        addedBackground: '#132a1c',
                        addedColor: '#4ade80',
                        removedBackground: '#2d1619',
                        removedColor: '#f87171',
                        wordAddedBackground: '#166534',
                        wordRemovedBackground: '#991b1b',
                        addedGutterBackground: '#1a3d25',
                        removedGutterBackground: '#3d1a1d',
                        codeFoldBackground: '#252538',
                        codeFoldGutterBackground: '#1e1e2e',
                        codeFoldContentColor: '#71717a',
                        emptyLineBackground: '#1a1a2e',
                      }
                    },
                    contentText: {
                      fontSize: '13px',
                      lineHeight: '1.6',
                    },
                    gutter: {
                      padding: '0 10px',
                      minWidth: '40px',
                    },
                    line: {
                      padding: '2px 10px',
                    }
                  }}
                />
              </div>
            </div>

            {/* 底部：描述输入和按钮 */}
            <div className="px-6 py-4 border-t border-border-subtle bg-background-elevated rounded-b-xl">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium whitespace-nowrap text-foreground-muted">版本描述:</label>
                <input
                  type="text"
                  value={versionDescription}
                  onChange={(e) => setVersionDescription(e.target.value)}
                  placeholder="描述本次修改..."
                  className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelSave}
                    className="px-5 py-2.5 text-sm border border-border rounded-lg hover:bg-background-hover transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmSave}
                    className="px-5 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors font-medium shadow-sm hover:shadow-md"
                  >
                    确认保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  )
}

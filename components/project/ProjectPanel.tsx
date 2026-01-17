'use client'

import { useState, useRef, useEffect } from 'react'
import { useProjectStore } from '@/lib/stores/projectStore'
import { 
  Plus, 
  Folder as FolderIcon,
  FolderOpen,
  FileText,
  ChevronRight, 
  ChevronDown, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  FolderPlus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Folder, Project } from '@/types'

export function ProjectPanel() {
  const { 
    projects, 
    folders,
    currentProject, 
    selectProject, 
    createProject, 
    updateProject, 
    deleteProject,
    createFolder,
    updateFolder,
    deleteFolder,
    toggleFolderCollapse,
    moveProjectToFolder
  } = useProjectStore()
  
  const [isCreating, setIsCreating] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [contextMenuId, setContextMenuId] = useState<string | null>(null)
  const [contextMenuType, setContextMenuType] = useState<'project' | 'folder' | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; type: 'project' | 'folder' } | null>(null)
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [draggedItemType, setDraggedItemType] = useState<'project' | 'folder' | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const handleCreateProject = async (folderId?: string) => {
    if (newProjectName.trim()) {
      await createProject(newProjectName.trim(), undefined, folderId)
      setNewProjectName('')
      setIsCreating(false)
    }
  }

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim())
      setNewFolderName('')
      setIsCreatingFolder(false)
    }
  }

  const handleRightClick = (e: React.MouseEvent, id: string, type: 'project' | 'folder') => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuId(id)
    setContextMenuType(type)
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
  }

  const closeContextMenu = () => {
    setContextMenuId(null)
    setContextMenuType(null)
    setContextMenuPosition(null)
  }

  const startRename = (id: string, currentName: string, type: 'project' | 'folder') => {
    if (type === 'project') {
      setEditingProjectId(id)
    } else {
      setEditingFolderId(id)
    }
    setEditingName(currentName)
    closeContextMenu()
  }

  const cancelRename = () => {
    setEditingProjectId(null)
    setEditingFolderId(null)
    setEditingName('')
  }

  const saveRename = async (id: string, type: 'project' | 'folder') => {
    const trimmedName = editingName.trim()
    if (!trimmedName) {
      cancelRename()
      return
    }

    if (type === 'project') {
      const currentName = projects.find(p => p.id === id)?.name
      if (trimmedName !== currentName) {
        if (projects.some(p => p.id !== id && p.name === trimmedName)) {
          alert('项目名称已存在')
          return
        }
        try {
          await updateProject(id, { name: trimmedName })
        } catch (error) {
          alert('重命名失败')
        }
      }
    } else {
      const currentName = folders.find(f => f.id === id)?.name
      if (trimmedName !== currentName) {
        if (folders.some(f => f.id !== id && f.name === trimmedName)) {
          alert('文件夹名称已存在')
          return
        }
        try {
          await updateFolder(id, { name: trimmedName })
        } catch (error) {
          alert('重命名失败')
        }
      }
    }
    cancelRename()
  }

  const handleDeleteClick = (id: string, type: 'project' | 'folder') => {
    setShowDeleteConfirm({ id, type })
    closeContextMenu()
  }

  const confirmDelete = async (id: string, type: 'project' | 'folder') => {
    try {
      if (type === 'project') {
        await deleteProject(id)
      } else {
        // 检查文件夹中是否有项目
        const projectsInFolder = projects.filter(p => p.folderId === id)
        const deleteProjects = projectsInFolder.length > 0 && 
          confirm(`文件夹中有 ${projectsInFolder.length} 个项目。是否删除所有项目？\n选择"确定"删除所有项目，选择"取消"只删除文件夹`)
        await deleteFolder(id, deleteProjects)
      }
      setShowDeleteConfirm(null)
    } catch (error) {
      alert('删除失败')
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string, type: 'project' | 'folder') => {
    setDraggedItemId(id)
    setDraggedItemType(type)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    if (draggedItemType === 'project' && draggedItemId) {
      e.dataTransfer.dropEffect = 'move'
      setDragOverFolderId(folderId)
    }
  }

  const handleDragLeave = () => {
    setDragOverFolderId(null)
  }

  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (draggedItemType === 'project' && draggedItemId) {
      await moveProjectToFolder(draggedItemId, folderId)
    }
    
    setDraggedItemId(null)
    setDraggedItemType(null)
    setDragOverFolderId(null)
  }

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      closeContextMenu()
    }
    
    if (contextMenuId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenuId])

  // 编辑时自动聚焦
  useEffect(() => {
    if ((editingProjectId || editingFolderId) && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingProjectId, editingFolderId])

  // 渲染文件夹内容
  const renderFolderContent = (folder: Folder) => {
    const projectsInFolder = projects.filter(p => p.folderId === folder.id)
    const isCollapsed = folder.collapsed
    
    return (
      <div key={folder.id} className="relative">
        {editingFolderId === folder.id ? (
          <div className="flex items-center gap-2 px-2 py-1.5">
            {isCollapsed ? <FolderIcon className="h-4 w-4 text-accent-amber" /> : <FolderOpen className="h-4 w-4 text-accent-amber" />}
            <input
              ref={editInputRef}
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename(folder.id, 'folder')
                if (e.key === 'Escape') cancelRename()
              }}
              onBlur={() => saveRename(folder.id, 'folder')}
              className="flex-1 px-1 py-0.5 text-sm bg-background border border-input rounded"
            />
          </div>
        ) : (
          <>
            <button
              onClick={() => toggleFolderCollapse(folder.id)}
              onContextMenu={(e) => handleRightClick(e, folder.id, 'folder')}
              onDoubleClick={() => startRename(folder.id, folder.name, 'folder')}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all hover:bg-background-hover group",
                dragOverFolderId === folder.id && "bg-primary-light border-2 border-primary shadow-sm scale-[1.02]"
              )}
            >
              <div className="transition-transform duration-200">
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 text-foreground-muted" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-foreground-muted" />
                )}
              </div>
              {isCollapsed ? (
                <FolderIcon className="h-4 w-4 text-accent-amber transition-colors" />
              ) : (
                <FolderOpen className="h-4 w-4 text-accent-amber transition-colors" />
              )}
              <span className="truncate flex-1 text-left font-medium text-foreground" title={folder.name}>{folder.name}</span>
              <span className="text-xs px-2 py-0.5 bg-background-elevated text-foreground-muted rounded-full font-medium">
                {projectsInFolder.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRightClick(e, folder.id, 'folder')
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background-elevated rounded transition-all"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </button>
            
            {!isCollapsed && (
              <div className="ml-5">
                {projectsInFolder.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-4 py-2">空文件夹</p>
                ) : (
                  projectsInFolder.map(project => renderProject(project, true))
                )}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // 渲染项目
  const renderProject = (project: Project, inFolder = false) => (
    <div key={project.id} className={cn("relative", inFolder && "ml-2")}>
      {editingProjectId === project.id ? (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="p-1 rounded-md bg-accent-blue/10">
            <FileText className="h-3.5 w-3.5 text-accent-blue" />
          </div>
          <input
            ref={editInputRef}
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRename(project.id, 'project')
              if (e.key === 'Escape') cancelRename()
            }}
            onBlur={() => saveRename(project.id, 'project')}
            className="flex-1 px-1 py-0.5 text-sm bg-background border border-input rounded"
          />
        </div>
      ) : (
        <button
          onClick={() => selectProject(project.id)}
          onContextMenu={(e) => handleRightClick(e, project.id, 'project')}
          onDoubleClick={() => startRename(project.id, project.name, 'project')}
          draggable
          onDragStart={(e) => handleDragStart(e, project.id, 'project')}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all group hover:bg-background-hover hover:shadow-sm",
            currentProject?.id === project.id && "bg-surface-raised border border-border-strong"
          )}
        >
          <div className="p-1 rounded-md bg-accent-blue/10">
            <FileText className="h-3.5 w-3.5 text-accent-blue" />
          </div>
          <span className="truncate flex-1 text-left font-medium text-foreground" title={project.name}>{project.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRightClick(e, project.id, 'project')
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background-elevated rounded transition-all"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </button>
      )}
    </div>
  )

  // 获取根级别项目（不在任何文件夹中的项目）
  const rootProjects = projects.filter(p => !p.folderId)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-subtle bg-background-elevated">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FolderIcon className="h-4 w-4" />
          Prompt管家
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="p-1.5 hover:bg-background-hover rounded-md transition-colors group"
            title="新建文件夹"
          >
            <FolderPlus className="h-4 w-4 text-foreground-muted group-hover:text-accent-amber transition-colors" />
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1.5 hover:bg-background-hover rounded-md transition-colors group"
            title="新建项目"
          >
            <Plus className="h-4 w-4 text-foreground-muted group-hover:text-primary transition-colors" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto"
          onDragOver={(e) => {
            if (draggedItemType === 'project') {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }
          }}
          onDrop={(e) => handleDrop(e, null)}
        >
          {isCreatingFolder && (
            <div className="p-2 border-b border-border">
              <div className="flex items-center gap-2">
                <FolderIcon className="h-4 w-4 text-accent-amber" />
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder()
                    if (e.key === 'Escape') {
                      setIsCreatingFolder(false)
                      setNewFolderName('')
                    }
                  }}
                  placeholder="文件夹名称..."
                  className="flex-1 px-2 py-1 text-sm bg-background border border-input rounded"
                  autoFocus
                />
              </div>
            </div>
          )}

          {isCreating && (
            <div className="p-2 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-accent-blue/10">
                  <FileText className="h-3.5 w-3.5 text-accent-blue" />
                </div>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject()
                    if (e.key === 'Escape') {
                      setIsCreating(false)
                      setNewProjectName('')
                    }
                  }}
                  placeholder="项目名称..."
                  className="flex-1 px-2 py-1 text-sm bg-background border border-input rounded"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="p-2">
            {folders.length === 0 && rootProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-4 text-center">
                暂无项目
              </p>
            ) : (
              <>
                {/* 渲染文件夹 */}
                {folders.map(folder => renderFolderContent(folder))}
                
                {/* 渲染根级别项目 */}
                {rootProjects.map(project => renderProject(project))}
              </>
            )}
          </div>
        </div>

      {/* 右键菜单 */}
      {contextMenuId && contextMenuPosition && (
        <div
          data-testid="context-menu"
          className="fixed z-50 bg-surface-raised border border-border rounded-lg shadow-xl py-1.5 min-w-[160px] animate-scale-in"
          style={{
            left: contextMenuPosition.x,
            top: Math.min(contextMenuPosition.y, window.innerHeight - 100) // 确保菜单不会超出底部
          }}
        >
          <button
            data-testid="context-menu-rename"
            onClick={() => {
              const item = contextMenuType === 'project'
                ? projects.find(p => p.id === contextMenuId)
                : folders.find(f => f.id === contextMenuId)
              if (item) startRename(contextMenuId, item.name, contextMenuType!)
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-background-hover transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5 text-foreground-muted" />
            <span>重命名</span>
          </button>
          <div className="h-px bg-border my-1" />
          <button
            data-testid="context-menu-delete"
            onClick={() => handleDeleteClick(contextMenuId, contextMenuType!)}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>删除</span>
          </button>
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-surface-raised border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl animate-scale-in">
            <h3 className="text-lg font-semibold mb-3 text-foreground">确认删除</h3>
            <p className="text-sm text-foreground-muted mb-6 leading-relaxed">
              {showDeleteConfirm.type === 'project'
                ? `确定要删除项目"${projects.find(p => p.id === showDeleteConfirm.id)?.name}"吗？`
                : `确定要删除文件夹"${folders.find(f => f.id === showDeleteConfirm.id)?.name}"吗？`}
              此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-background-hover transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={() => confirmDelete(showDeleteConfirm.id, showDeleteConfirm.type)}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-medium shadow-sm"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
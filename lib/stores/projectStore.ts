import { create } from 'zustand'
import { Project, Version, Folder, ProjectStructure } from '@/types'
import { getDB } from './database'
import { v4 as uuidv4 } from 'uuid'

interface LocalProject {
  name: string
  versions: {
    versionNumber: number
    content: string
    fileName: string
  }[]
}

interface LoadLocalResponse {
  success: boolean
  projects: LocalProject[]
  structure: ProjectStructure | null
  lastModified: string | null
}

interface ProjectState {
  projects: Project[]
  folders: Folder[]
  currentProject: Project | null
  isLoading: boolean
  loadProjects: () => Promise<void>
  createProject: (name: string, description?: string, folderId?: string) => Promise<Project>
  selectProject: (projectId: string) => void
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  createFolder: (name: string, parentId?: string) => Promise<Folder>
  updateFolder: (folderId: string, updates: Partial<Folder>) => Promise<void>
  deleteFolder: (folderId: string, deleteProjects?: boolean) => Promise<void>
  toggleFolderCollapse: (folderId: string) => Promise<void>
  moveProjectToFolder: (projectId: string, folderId: string | null) => Promise<void>
  restoreFromLocal: () => Promise<void>
  syncStructureToLocal: () => Promise<void>
  needsRestoreFromLocal: () => Promise<boolean>
}

// 使用共享的数据库配置

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  folders: [],
  currentProject: null,
  isLoading: false,

  loadProjects: async () => {
    set({ isLoading: true })
    try {
      const db = await getDB()
      
      // 智能检测是否需要从本地文件恢复
      const needsRestore = await get().needsRestoreFromLocal()
      
      if (needsRestore) {
        console.log('Local files changed or no data found, restoring from local files...')
        await get().restoreFromLocal()
      } else {
        console.log('Using existing IndexedDB data')
      }
      
      // 获取数据
      let projects = await db.getAll('projects')
      let folders = []
      
      try {
        folders = await db.getAll('folders')
      } catch (error) {
        console.log('Folders store not available, using empty array')
        folders = []
      }
      
      // 按名称去重，防御潜在重复
      const seen = new Set<string>()
      projects = projects.filter(p => {
        if (seen.has(p.name)) return false
        seen.add(p.name)
        return true
      })
      
      set({ 
        projects,
        folders,
        currentProject: projects.length > 0 ? projects[0] : null,
        isLoading: false 
      })
    } catch (error) {
      console.error('Failed to load projects:', error)
      set({ isLoading: false })
    }
  },

  createProject: async (name: string, description?: string, folderId?: string) => {
    const newProject: Project = {
      id: uuidv4(),
      name,
      description,
      folderId,
      currentVersion: 0,
      config: {
        systemLimits: {
          maxTokens: 4000,
          temperature: 0.7,
          model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          responseFormat: 'markdown',
          timeout: 30,
          retryAttempts: 3
        },
        outputRequirements: {
          format: {
            type: 'structured',
            schema: {}
          },
          constraints: [],
          examples: [],
          validation: {
            required: [],
            optional: []
          }
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

    try {
      const db = await getDB()
      await db.add('projects', newProject)
      const projects = [...get().projects, newProject]
      set({ projects, currentProject: newProject })
      
      // 同步到本地文件
      setTimeout(() => get().syncStructureToLocal(), 100)
      
      return newProject
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error
    }
  },

  selectProject: (projectId: string) => {
    const project = get().projects.find(p => p.id === projectId)
    if (project) {
      set({ currentProject: project })
    }
  },

  updateProject: async (projectId: string, updates: Partial<Project>) => {
    try {
      const db = await getDB()
      const project = await db.get('projects', projectId)
      if (project) {
        // 同步重命名到文件系统
        if (updates.name && updates.name !== project.name) {
          try {
            const renameResponse = await fetch('/api/rename-local', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ oldName: project.name, newName: updates.name })
            });
            if (!renameResponse.ok) {
              console.warn('Failed to rename project in filesystem, but continuing with IndexedDB update');
            }
          } catch (e) {
            console.warn('Failed to rename project in filesystem:', e);
          }
        }
        const updatedProject = {
          ...project,
          ...updates,
          metadata: {
            ...project.metadata,
            updatedAt: new Date()
          }
        }
        await db.put('projects', updatedProject)
        const projects = get().projects.map(p => 
          p.id === projectId ? updatedProject : p
        )
        set({ 
          projects,
          currentProject: get().currentProject?.id === projectId ? updatedProject : get().currentProject
        })
        
        // 同步结构到本地
        setTimeout(() => get().syncStructureToLocal(), 100)
      }
    } catch (error) {
      console.error('Failed to update project:', error)
      throw error
    }
  },

  deleteProject: async (projectId: string) => {
    try {
      const db = await getDB()
      // 同步删除到文件系统
      const projectToDelete = get().projects.find(p => p.id === projectId)
      if (projectToDelete) {
        try {
          const deleteResponse = await fetch('/api/delete-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectName: projectToDelete.name })
          });
          if (!deleteResponse.ok) {
            console.warn('Failed to delete project from filesystem, but continuing with IndexedDB delete');
          }
        } catch (e) {
          console.warn('Failed to delete project from filesystem:', e);
        }
      }
      await db.delete('projects', projectId)
      const projects = get().projects.filter(p => p.id !== projectId)
      set({ 
        projects,
        currentProject: get().currentProject?.id === projectId 
          ? (projects.length > 0 ? projects[0] : null)
          : get().currentProject
      })
      
      // 同步结构到本地
      setTimeout(() => get().syncStructureToLocal(), 100)
    } catch (error) {
      console.error('Failed to delete project:', error)
      throw error
    }
  },

  createFolder: async (name: string, parentId?: string) => {
    const newFolder: Folder = {
      id: uuidv4(),
      name,
      parentId,
      collapsed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    try {
      const db = await getDB()
      await db.add('folders', newFolder)
      const folders = [...get().folders, newFolder]
      set({ folders })
      
      // 同步到本地文件
      setTimeout(() => get().syncStructureToLocal(), 100)
      
      return newFolder
    } catch (error) {
      console.error('Failed to create folder:', error)
      throw error
    }
  },

  updateFolder: async (folderId: string, updates: Partial<Folder>) => {
    try {
      const db = await getDB()
      const folder = await db.get('folders', folderId)
      if (folder) {
        const updatedFolder = {
          ...folder,
          ...updates,
          updatedAt: new Date()
        }
        await db.put('folders', updatedFolder)
        const folders = get().folders.map(f => 
          f.id === folderId ? updatedFolder : f
        )
        set({ folders })
        
        // 同步到本地文件
        setTimeout(() => get().syncStructureToLocal(), 100)
      }
    } catch (error) {
      console.error('Failed to update folder:', error)
      throw error
    }
  },

  deleteFolder: async (folderId: string, deleteProjects = false) => {
    try {
      const db = await getDB()
      
      // 如果需要删除内部项目
      if (deleteProjects) {
        const projectsInFolder = get().projects.filter(p => p.folderId === folderId)
        for (const project of projectsInFolder) {
          await db.delete('projects', project.id)
        }
        const remainingProjects = get().projects.filter(p => p.folderId !== folderId)
        set({ projects: remainingProjects })
      } else {
        // 将项目移出文件夹
        const projectsInFolder = get().projects.filter(p => p.folderId === folderId)
        for (const project of projectsInFolder) {
          const updatedProject = { ...project, folderId: undefined }
          await db.put('projects', updatedProject)
        }
        const projects = get().projects.map(p => 
          p.folderId === folderId ? { ...p, folderId: undefined } : p
        )
        set({ projects })
      }
      
      // 删除文件夹
      await db.delete('folders', folderId)
      const folders = get().folders.filter(f => f.id !== folderId)
      set({ folders })
      
      // 同步到本地文件
      setTimeout(() => get().syncStructureToLocal(), 100)
    } catch (error) {
      console.error('Failed to delete folder:', error)
      throw error
    }
  },

  toggleFolderCollapse: async (folderId: string) => {
    try {
      const db = await getDB()
      const folder = await db.get('folders', folderId)
      if (folder) {
        const updatedFolder = {
          ...folder,
          collapsed: !folder.collapsed,
          updatedAt: new Date()
        }
        await db.put('folders', updatedFolder)
        const folders = get().folders.map(f => 
          f.id === folderId ? updatedFolder : f
        )
        set({ folders })
        
        // 同步到本地文件
        setTimeout(() => get().syncStructureToLocal(), 100)
      }
    } catch (error) {
      console.error('Failed to toggle folder collapse:', error)
      throw error
    }
  },

  moveProjectToFolder: async (projectId: string, folderId: string | null) => {
    try {
      const db = await getDB()
      const project = await db.get('projects', projectId)
      if (project) {
        const updatedProject = {
          ...project,
          folderId: folderId || undefined,
          metadata: {
            ...project.metadata,
            updatedAt: new Date()
          }
        }
        await db.put('projects', updatedProject)
        const projects = get().projects.map(p => 
          p.id === projectId ? updatedProject : p
        )
        set({ 
          projects,
          currentProject: get().currentProject?.id === projectId ? updatedProject : get().currentProject
        })
        
        // 同步到本地文件
        setTimeout(() => get().syncStructureToLocal(), 100)
      }
    } catch (error) {
      console.error('Failed to move project to folder:', error)
      throw error
    }
  },

  restoreFromLocal: async () => {
    try {
      const response = await fetch('/api/load-local')
      const data: LoadLocalResponse = await response.json()
      
      if (!data.success || !data.projects || data.projects.length === 0) {
        console.log('No local projects to restore')
        return
      }

      // 预先按名称去重，避免本地目录出现重复项目名时在 UI 里重复渲染
      const uniqueProjectsMap = new Map<string, LocalProject>()
      for (const proj of data.projects) {
        if (!uniqueProjectsMap.has(proj.name)) {
          uniqueProjectsMap.set(proj.name, proj)
        }
      }
      const uniqueProjects = Array.from(uniqueProjectsMap.values())
      
      const db = await getDB()
      
      // 获取现有项目、文件夹和版本以保持UUID和描述稳定性
      const existingProjects = new Map<string, Project>()  // name -> project
      const existingProjectsById = new Map<string, Project>()  // id -> project (新增：用于ID查找)
      const existingFolders = new Map<string, Folder>()
      const existingVersions = new Map<string, Version[]>() // projectName -> versions
      
      try {
        const projects = await db.getAll('projects')
        projects.forEach(project => {
          existingProjects.set(project.name, project)
          existingProjectsById.set(project.id, project)  // 同时建立 ID 映射
        })
        
        const folders = await db.getAll('folders')
        folders.forEach(folder => {
          existingFolders.set(folder.name, folder)
        })
        
        const versions = await db.getAll('versions')
        const projectVersionMap = new Map<string, Version[]>()
        
        // 按项目ID分组版本
        for (const version of versions) {
          const project = projects.find(p => p.id === version.projectId)
          if (project) {
            if (!projectVersionMap.has(project.name)) {
              projectVersionMap.set(project.name, [])
            }
            projectVersionMap.get(project.name)!.push(version)
          }
        }
        
        // 按版本号排序
        projectVersionMap.forEach((versions, projectName) => {
          versions.sort((a, b) => a.versionNumber - b.versionNumber)
          existingVersions.set(projectName, versions)
        })
      } catch (error) {
        console.log('Could not read existing data')
      }
      
      // 清除现有数据
      try {
        const projects = await db.getAll('projects')
        for (const project of projects) {
          await db.delete('projects', project.id)
        }
        
        const versions = await db.getAll('versions')
        for (const version of versions) {
          await db.delete('versions', version.id)
        }
        
        const folders = await db.getAll('folders')
        for (const folder of folders) {
          await db.delete('folders', folder.id)
        }
      } catch (error) {
        console.log('Could not clear existing data, continuing with restoration')
      }
      
      // 如果有结构配置，先恢复文件夹
      if (data.structure && data.structure.folders) {
        
        // 创建新文件夹，保持已有的UUID
        for (const localFolder of data.structure.folders) {
          const existingFolder = existingFolders.get(localFolder.name)
          const newFolder: Folder = {
            id: existingFolder ? existingFolder.id : localFolder.id,
            name: localFolder.name,
            parentId: localFolder.parentId || undefined,
            collapsed: existingFolder ? existingFolder.collapsed : false,
            createdAt: existingFolder ? existingFolder.createdAt : new Date(),
            updatedAt: new Date()
          }
          try {
            await db.add('folders', newFolder)
          } catch (error) {
            console.error('Failed to create folder:', localFolder.name)
          }
        }
      }
      
      for (const localProject of uniqueProjects as LocalProject[]) {
        // 从结构配置中获取文件夹映射
        let folderId: string | undefined
        let matchMethod = 'none'
        let matchedProjectId: string | undefined
        
        if (data.structure) {
          // 1. 首先尝试用文件系统名称直接匹配 projectMappings
          if (data.structure.projectMappings) {
            folderId = data.structure.projectMappings[localProject.name] || undefined
            if (folderId) matchMethod = 'name-direct'
          }
          
          // 2. 如果名称匹配失败，用 fsNameToProjectId 查找项目ID，然后用ID查找folderId
          if (!folderId && data.structure.fsNameToProjectId && data.structure.projectIdMappings) {
            // 用文件系统名称查找项目 ID
            const projectId = data.structure.fsNameToProjectId[localProject.name]
            if (projectId && data.structure.projectIdMappings[projectId]) {
              const idMapping = data.structure.projectIdMappings[projectId]
              folderId = idMapping.folderId || undefined
              matchedProjectId = projectId
              if (folderId) matchMethod = 'fsName-to-id'
            }
          }
          
          // 3. 如果还是没找到，尝试用已存在项目的 ID 直接查找
          if (!folderId && data.structure.projectIdMappings) {
            const existingProject = existingProjects.get(localProject.name)
            if (existingProject && data.structure.projectIdMappings[existingProject.id]) {
              const idMapping = data.structure.projectIdMappings[existingProject.id]
              folderId = idMapping.folderId || undefined
              matchedProjectId = existingProject.id
              if (folderId) matchMethod = 'existing-id'
            }
          }
        }
        
        // 创建项目，保持已有的UUID和配置
        const existingProject = existingProjects.get(localProject.name)
        const projectId = existingProject ? existingProject.id : uuidv4()
        const newProject: Project = {
          id: projectId,
          name: localProject.name,
          description: existingProject ? existingProject.description : `从本地备份恢复 (${localProject.versions.length} 个版本)`,
          folderId,
          currentVersion: existingProject ? existingProject.currentVersion : (localProject.versions.length > 0 
            ? localProject.versions[localProject.versions.length - 1].versionNumber 
            : 0),
          config: existingProject ? existingProject.config : {
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
            createdAt: existingProject ? existingProject.metadata.createdAt : new Date(),
            updatedAt: new Date(),
            tags: existingProject ? existingProject.metadata.tags : ['restored'],
            category: existingProject ? existingProject.metadata.category : 'other'
          }
        }
        
        await db.add('projects', newProject)
        
        // 创建版本，保持现有版本的描述和ID
        const existingProjectVersions = existingVersions.get(localProject.name) || []
        
        for (const ver of localProject.versions) {
          // 查找对应的现有版本
          const existingVersion = existingProjectVersions.find(v => v.versionNumber === ver.versionNumber)
          
          // 获取保存的版本描述，优先使用 structure.json 中的描述
          let versionDescription: string | undefined
          if (data.structure?.versionDescriptions?.[localProject.name]?.[ver.versionNumber]) {
            versionDescription = data.structure.versionDescriptions[localProject.name][ver.versionNumber]
          } else if (existingVersion?.description) {
            versionDescription = existingVersion.description
          }
          
          const version: Version = {
            id: existingVersion ? existingVersion.id : uuidv4(),
            projectId,
            versionNumber: ver.versionNumber,
            content: ver.content,
            timestamp: existingVersion ? existingVersion.timestamp : new Date(),
            description: versionDescription,
            autoGenerated: existingVersion ? existingVersion.autoGenerated : false,
            metadata: {
              lines: ver.content.split('\n').length,
              characters: ver.content.length,
              words: ver.content.trim().split(/\s+/).filter(w => w.length > 0).length,
              changeType: existingVersion ? existingVersion.metadata.changeType : 'minor'
            }
          }
          await db.add('versions', version)
        }
        
        console.log(`Restored project: ${localProject.name} with ${localProject.versions.length} versions`)
      }
      
      // 记录恢复时间戳
      try {
        await db.put('metadata', {
          key: 'lastRestore',
          value: new Date().toISOString()
        })
      } catch (error) {
        console.error('Failed to save restore timestamp:', error)
      }
      
      // 恢复完成后，立即同步 structure.json
      // 这样可以确保映射键与文件系统名称一致
      setTimeout(() => get().syncStructureToLocal(), 500)
    } catch (error) {
      console.error('Failed to restore from local:', error)
    }
  },

  syncStructureToLocal: async () => {
    try {
      const { projects, folders } = get()
      const db = await getDB()
      
      // 先读取现有的 structure.json，保留有效的映射（不用 null 覆盖已有的 folderId）
      let existingStructure: ProjectStructure | null = null
      try {
        const existingResponse = await fetch('/api/structure')
        if (existingResponse.ok) {
          const existingData = await existingResponse.json()
          existingStructure = existingData.structure
        }
      } catch (e) {
        // 忽略错误，继续使用空结构
      }
      
      // 构建结构对象
      const structure: ProjectStructure = {
        version: "1.0.0",
        folders: folders.map(folder => ({
          id: folder.id,
          name: folder.name,
          parentId: folder.parentId
        })),
        projectMappings: {},
        projectIdMappings: {},  // 项目ID -> {folderId, fsName}
        fsNameToProjectId: {},  // 文件系统名称 -> 项目ID (关键映射)
        versionDescriptions: {},
        lastUpdated: new Date().toISOString()
      }
      
      // 添加项目映射和版本描述
      for (const project of projects) {
        // 确定最终的 folderId：
        // 1. 优先使用当前 IndexedDB 中的 folderId（用户最新操作）
        // 2. 如果为 null，尝试从现有 structure.json 中保留有效的 folderId
        let finalFolderId = project.folderId || null
        let preserveSource = ''
        if (!finalFolderId && existingStructure) {
          // 方法1：直接用项目名称查找
          if (existingStructure.projectMappings?.[project.name]) {
            finalFolderId = existingStructure.projectMappings[project.name]
            preserveSource = 'projectMappings-direct'
          }
          // 方法2：用项目ID在 projectIdMappings 中查找
          if (!finalFolderId && existingStructure.projectIdMappings?.[project.id]?.folderId) {
            finalFolderId = existingStructure.projectIdMappings[project.id].folderId
            preserveSource = 'projectIdMappings'
          }
          // 方法3：用文件系统名称通过 fsNameToProjectId 查找旧 ID，再查 projectIdMappings
          if (!finalFolderId && existingStructure.fsNameToProjectId && existingStructure.projectIdMappings) {
            const oldProjectId = existingStructure.fsNameToProjectId[project.name]
            if (oldProjectId && existingStructure.projectIdMappings[oldProjectId]?.folderId) {
              finalFolderId = existingStructure.projectIdMappings[oldProjectId].folderId
              preserveSource = 'fsNameToProjectId->projectIdMappings'
            }
          }
          // 方法4：遍历所有 projectMappings 寻找名称变体（忽略短横线差异）
          if (!finalFolderId && existingStructure.projectMappings) {
            const normalizedName = project.name.replace(/[-\s]/g, '').toLowerCase()
            for (const [key, folderId] of Object.entries(existingStructure.projectMappings)) {
              if (folderId && key.replace(/[-\s]/g, '').toLowerCase() === normalizedName) {
                finalFolderId = folderId
                preserveSource = `projectMappings-normalized:${key}`
                break
              }
            }
          }
        }
        
        // 保存名称映射（向后兼容）
        structure.projectMappings[project.name] = finalFolderId
        // 保存ID映射
        structure.projectIdMappings![project.id] = {
          folderId: finalFolderId,
          fsName: project.name
        }
        // 保存文件系统名称到ID的映射（关键：用于名称不匹配时查找）
        structure.fsNameToProjectId![project.name] = project.id
        
        // 获取项目的所有版本并添加描述
        const versions = await db.transaction('versions', 'readonly')
          .objectStore('versions')
          .index('projectId')
          .getAll(project.id)
        
        const projectVersionDescriptions: Record<number, string> = {}
        versions.forEach(version => {
          if (version.description) {
            projectVersionDescriptions[version.versionNumber] = version.description
          }
        })
        
        if (Object.keys(projectVersionDescriptions).length > 0) {
          if (!structure.versionDescriptions) {
            structure.versionDescriptions = {}
          }
          structure.versionDescriptions[project.name] = projectVersionDescriptions
        }
      }
      
      // 保存到本地
      const response = await fetch('/api/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structure })
      })
      
      if (!response.ok) {
        throw new Error('Failed to sync structure to local file')
      }
      
      // 更新 lastLocalSync 时间戳
      await db.put('metadata', { key: 'lastLocalSync', value: new Date().toISOString() })
      
      console.log('Structure synced to local file successfully')
    } catch (error) {
      console.error('Failed to sync structure to local:', error)
    }
  },

  needsRestoreFromLocal: async () => {
    // 每次启动都从本地 /prompts 文件夹同步
    // 本地文件是数据源（source of truth）
    // restoreFromLocal() 已正确实现合并逻辑：
    // - 保持现有 UUID 和元数据
    // - 使用 structure.json 配置文件夹映射和版本描述
    // - 无重复（先清除再用合并数据重建）
    console.log('Startup: syncing from local /prompts folder')
    return true
  }
}))

// 在浏览器环境中暴露 store 到 window，用于 E2E 测试
if (typeof window !== 'undefined') {
  (window as any).__ZUSTAND_PROJECT_STORE__ = useProjectStore
}
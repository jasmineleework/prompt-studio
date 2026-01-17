import { openDB, IDBPDatabase } from 'idb'

/**
 * 数据库名称
 * 测试环境使用 PromptWorkbench_Test
 * 生产环境使用 PromptWorkbench
 */
function getDBName(): string {
  if (typeof window !== 'undefined') {
    const isTest = window.localStorage.getItem('PLAYWRIGHT_TEST') === 'true'
    return isTest ? 'PromptWorkbench_Test' : 'PromptWorkbench'
  }
  return 'PromptWorkbench'
}

export const DB_NAME = 'PromptWorkbench' // 保留用于类型兼容
export const DB_VERSION = 4

export async function getDB() {
  const dbName = getDBName()
  return openDB(dbName, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`)
      
      // 处理 projects store
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' })
        projectStore.createIndex('name', 'name', { unique: false })
        projectStore.createIndex('updatedAt', 'metadata.updatedAt', { unique: false })
        projectStore.createIndex('folderId', 'folderId', { unique: false })
      } else if (oldVersion < 2) {
        // 升级现有的 projects store，添加 folderId 索引
        const projectStore = transaction.objectStore('projects')
        if (!projectStore.indexNames.contains('folderId')) {
          projectStore.createIndex('folderId', 'folderId', { unique: false })
        }
      }
      
      // 处理 versions store
      if (!db.objectStoreNames.contains('versions')) {
        const versionStore = db.createObjectStore('versions', { keyPath: 'id' })
        versionStore.createIndex('projectId', 'projectId', { unique: false })
        versionStore.createIndex('versionNumber', 'versionNumber', { unique: false })
      }
      
      // 处理 folders store (v2 新增)
      if (newVersion && newVersion >= 2 && !db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' })
        folderStore.createIndex('name', 'name', { unique: false })
        folderStore.createIndex('parentId', 'parentId', { unique: false })
      }
      
      // 处理 metadata store (v3 新增)
      if (newVersion && newVersion >= 3 && !db.objectStoreNames.contains('metadata')) {
        const metadataStore = db.createObjectStore('metadata', { keyPath: 'key' })
      }
      
      // 处理搜索相关 stores (v4 新增)
      if (newVersion && newVersion >= 4) {
        // 搜索索引表
        if (!db.objectStoreNames.contains('searchIndex')) {
          const searchIndex = db.createObjectStore('searchIndex', { keyPath: 'id' })
          searchIndex.createIndex('projectId', 'projectId', { unique: false })
          searchIndex.createIndex('versionId', 'versionId', { unique: false })
          searchIndex.createIndex('keywords', 'keywords', { unique: false, multiEntry: true })
        }
        
        // 搜索历史表
        if (!db.objectStoreNames.contains('searchHistory')) {
          const searchHistory = db.createObjectStore('searchHistory', { keyPath: 'id', autoIncrement: true })
          searchHistory.createIndex('query', 'query', { unique: false })
          searchHistory.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    },
    
    blocked() {
      console.warn('Database upgrade blocked. Please close all other tabs with this app.')
    },
    
    blocking() {
      console.warn('This tab is blocking a database upgrade in another tab.')
    },
    
    terminated() {
      console.error('Database connection terminated unexpectedly')
    }
  })
}
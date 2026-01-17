import { openDB } from 'idb'

// 数据库迁移辅助函数
export async function clearOldDatabase() {
  try {
    // 删除旧版本数据库，强制重新创建
    await deleteDB('PromptWorkbench')
    console.log('Old database cleared')
  } catch (error) {
    console.error('Failed to clear old database:', error)
  }
}

async function deleteDB(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const deleteReq = indexedDB.deleteDatabase(name)
    deleteReq.onsuccess = () => resolve()
    deleteReq.onerror = () => reject(deleteReq.error)
    deleteReq.onblocked = () => {
      console.warn('Database delete blocked')
      resolve() // 即使被阻塞也继续
    }
  })
}

// 检查数据库版本
export async function checkDBVersion(): Promise<number> {
  try {
    const db = await openDB('PromptWorkbench', 1, {
      upgrade() {
        // 不做任何操作，只是检查版本
      }
    })
    const version = db.version
    db.close()
    return version
  } catch (error) {
    return 0
  }
}
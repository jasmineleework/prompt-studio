import { Page, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 测试工具函数
 * 提供常用的测试辅助功能
 * 
 * 重要：测试数据完全隔离
 * - 文件存储: prompts-test/ (不影响真实数据 prompts/)
 * - 数据库: PromptWorkbench_Test (不影响真实数据库 PromptWorkbench)
 */

/**
 * 获取测试目录路径
 */
export function getTestPromptsDir(): string {
  return path.join(process.cwd(), 'prompts-test')
}

/**
 * 设置测试环境标记（在浏览器中）
 * 必须在页面加载前调用
 */
export async function setupTestEnvironment(page: Page): Promise<void> {
  // 在页面加载前设置 localStorage
  await page.addInitScript(() => {
    window.localStorage.setItem('PLAYWRIGHT_TEST', 'true')
  })
}

/**
 * 生成唯一的测试数据标识符
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 等待应用完全加载
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // 等待 Loading 状态消失
  await page.waitForSelector('text=Loading workspace', { state: 'hidden', timeout: 30000 }).catch(() => {})
  
  // 等待主界面元素可见
  await page.waitForSelector('text=Prompt管家', { timeout: 10000 })
}

/**
 * 清除测试 IndexedDB 数据
 * 仅清除测试数据库 PromptWorkbench_Test
 */
export async function clearTestIndexedDB(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // 仅删除测试数据库，不影响真实数据
    indexedDB.deleteDatabase('PromptWorkbench_Test')
  })
}

/**
 * 清除所有 IndexedDB 数据（慎用）
 * @deprecated 推荐使用 clearTestIndexedDB
 */
export async function clearIndexedDB(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases()
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name)
      }
    }
  })
}

/**
 * 刷新页面并等待就绪
 * 注意：刷新前需要等待一段时间以确保 structure.json 同步完成
 * 因为 syncStructureToLocal() 有 100ms 延迟
 */
export async function reloadAndWait(page: Page): Promise<void> {
  // 等待 structure.json 同步完成（syncStructureToLocal 延迟 100ms + API调用 + 写入时间）
  await page.waitForTimeout(1500)
  await page.reload()
  await waitForAppReady(page)
  // 等待 API 调用完成（load-local + structure）
  await page.waitForResponse(resp => resp.url().includes('/api/load-local'), { timeout: 10000 }).catch(() => {})
  // 额外等待数据加载和渲染完成
  await page.waitForTimeout(1000)
}

/**
 * 获取测试 IndexedDB 中的数据统计
 * 使用 PromptWorkbench_Test 数据库
 */
export async function getDBStats(page: Page): Promise<{
  projectCount: number
  versionCount: number
  folderCount: number
}> {
  return await page.evaluate(async () => {
    return new Promise((resolve) => {
      // 设置超时保护
      const timeoutId = setTimeout(() => {
        resolve({ projectCount: 0, versionCount: 0, folderCount: 0 })
      }, 5000)
      
      // 使用测试数据库名称
      const dbName = window.localStorage.getItem('PLAYWRIGHT_TEST') === 'true' 
        ? 'PromptWorkbench_Test' 
        : 'PromptWorkbench'
      const request = indexedDB.open(dbName)
      request.onsuccess = () => {
        try {
          const db = request.result
          
          let projectCount = 0
          let versionCount = 0
          let folderCount = 0
          let completedCount = 0
          
          const checkComplete = () => {
            completedCount++
            if (completedCount >= 3) {
              clearTimeout(timeoutId)
              resolve({ projectCount, versionCount, folderCount })
            }
          }
          
          // Projects
          if (db.objectStoreNames.contains('projects')) {
            const projectTx = db.transaction('projects', 'readonly')
            projectTx.objectStore('projects').count().onsuccess = (e) => {
              projectCount = (e.target as IDBRequest).result
              checkComplete()
            }
            projectTx.onerror = checkComplete
          } else {
            checkComplete()
          }
          
          // Versions
          if (db.objectStoreNames.contains('versions')) {
            const versionTx = db.transaction('versions', 'readonly')
            versionTx.objectStore('versions').count().onsuccess = (e) => {
              versionCount = (e.target as IDBRequest).result
              checkComplete()
            }
            versionTx.onerror = checkComplete
          } else {
            checkComplete()
          }
          
          // Folders
          if (db.objectStoreNames.contains('folders')) {
            const folderTx = db.transaction('folders', 'readonly')
            folderTx.objectStore('folders').count().onsuccess = (e) => {
              folderCount = (e.target as IDBRequest).result
              checkComplete()
            }
            folderTx.onerror = checkComplete
          } else {
            checkComplete()
          }
        } catch (error) {
          clearTimeout(timeoutId)
          resolve({ projectCount: 0, versionCount: 0, folderCount: 0 })
        }
      }
      request.onerror = () => {
        clearTimeout(timeoutId)
        resolve({ projectCount: 0, versionCount: 0, folderCount: 0 })
      }
    })
  })
}

/**
 * 验证测试目录中的文件
 * 使用 prompts-test/ 目录，不影响真实数据
 */
export function verifyLocalFile(projectName: string, versionNumber: number): boolean {
  const promptsDir = path.join(getTestPromptsDir(), projectName)
  const fileName = `${projectName}_v${versionNumber}.md`
  const filePath = path.join(promptsDir, fileName)
  
  return fs.existsSync(filePath)
}

/**
 * 读取测试目录中的文件内容
 * 使用 prompts-test/ 目录，不影响真实数据
 */
export function readLocalFile(projectName: string, versionNumber: number): string | null {
  const promptsDir = path.join(getTestPromptsDir(), projectName)
  const fileName = `${projectName}_v${versionNumber}.md`
  const filePath = path.join(promptsDir, fileName)
  
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8')
  }
  return null
}

/**
 * 读取测试目录的 structure.json
 * 使用 prompts-test/ 目录，不影响真实数据
 */
export function readStructureJson(): any | null {
  const structurePath = path.join(getTestPromptsDir(), 'structure.json')
  
  if (fs.existsSync(structurePath)) {
    const content = fs.readFileSync(structurePath, 'utf-8')
    return JSON.parse(content)
  }
  return null
}

/**
 * 清理测试创建的项目文件夹
 * 使用 prompts-test/ 目录，不影响真实数据
 */
export function cleanupTestProject(projectName: string): void {
  const promptsDir = path.join(getTestPromptsDir(), projectName)
  
  if (fs.existsSync(promptsDir)) {
    fs.rmSync(promptsDir, { recursive: true, force: true })
  }
}

/**
 * 清理所有测试数据（文件系统）
 */
export function cleanupAllTestData(): void {
  const testDir = getTestPromptsDir()
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true })
    fs.mkdirSync(testDir, { recursive: true })
    // 重新创建默认 structure.json
    const defaultStructure = {
      version: "1.0.0",
      folders: [],
      projectMappings: {},
      lastUpdated: new Date().toISOString()
    }
    fs.writeFileSync(
      path.join(testDir, 'structure.json'),
      JSON.stringify(defaultStructure, null, 2)
    )
  }
}

/**
 * 等待指定时间
 */
export async function wait(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 截图并保存
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const screenshotDir = path.join(process.cwd(), 'test-results', 'screenshots')
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true })
  }
  
  await page.screenshot({
    path: path.join(screenshotDir, `${name}_${Date.now()}.png`),
    fullPage: true
  })
}

/**
 * 模拟文件下载并验证
 */
export async function waitForDownload(page: Page): Promise<string | null> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
  ])
  
  const suggestedFilename = download.suggestedFilename()
  return suggestedFilename
}

/**
 * 验证元素在页面上可见
 */
export async function assertVisible(page: Page, selector: string, timeout: number = 5000): Promise<void> {
  await expect(page.locator(selector)).toBeVisible({ timeout })
}

/**
 * 验证元素在页面上不可见
 */
export async function assertHidden(page: Page, selector: string, timeout: number = 5000): Promise<void> {
  await expect(page.locator(selector)).toBeHidden({ timeout })
}

/**
 * 验证文本内容
 */
export async function assertText(page: Page, selector: string, text: string): Promise<void> {
  await expect(page.locator(selector)).toContainText(text)
}

/**
 * 测试日志工具
 * 在测试中输出带时间戳的日志
 */
export function testLog(message: string, data?: any): void {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1)
  if (data) {
    console.log(`[${timestamp}] ${message}`, data)
  } else {
    console.log(`[${timestamp}] ${message}`)
  }
}

/**
 * 列出测试目录中的所有文件
 * 用于调试时查看测试数据状态
 */
export function listTestFiles(): string[] {
  const testDir = getTestPromptsDir()
  const files: string[] = []
  
  function walkDir(dir: string, prefix: string = '') {
    if (!fs.existsSync(dir)) return
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const relativePath = prefix ? `${prefix}/${item}` : item
      if (fs.statSync(fullPath).isDirectory()) {
        walkDir(fullPath, relativePath)
      } else {
        files.push(relativePath)
      }
    }
  }
  
  walkDir(testDir)
  return files
}

/**
 * 打印测试数据状态（调试用）
 */
export function printTestDataStatus(): void {
  testLog('=== 测试数据状态 ===')
  testLog(`测试目录: ${getTestPromptsDir()}`)
  const files = listTestFiles()
  testLog(`文件数量: ${files.length}`)
  files.forEach(f => testLog(`  - ${f}`))
  testLog('==================')
}

import { test as base, expect, Page } from '@playwright/test'
import { ProjectPanelPage, EditorPage, SearchPage, VersionSelectorPage } from '../helpers/page-objects'
import { setupTestEnvironment } from '../helpers/test-utils'

/**
 * 扩展的测试 fixtures
 * 提供 Page Object 实例和常用测试数据
 * 
 * 重要：测试数据完全隔离
 * - 文件存储: prompts-test/ (不影响真实数据)
 * - 数据库: PromptWorkbench_Test (不影响真实数据库)
 */

// 测试数据类型定义
interface TestData {
  projectName: string
  folderName: string
  content: string
  versionDescription: string
}

// Fixture 类型定义
interface TestFixtures {
  projectPanel: ProjectPanelPage
  editor: EditorPage
  search: SearchPage
  versionSelector: VersionSelectorPage
  testData: TestData
}

// 创建扩展的 test fixture
export const test = base.extend<TestFixtures>({
  // 设置测试环境（必须在页面加载前设置）
  page: async ({ page }, use) => {
    // 在页面加载前设置测试环境标记
    await setupTestEnvironment(page)
    await use(page)
  },
  
  // Project Panel Page Object
  projectPanel: async ({ page }, use) => {
    const projectPanel = new ProjectPanelPage(page)
    await use(projectPanel)
  },
  
  // Editor Page Object
  editor: async ({ page }, use) => {
    const editor = new EditorPage(page)
    await use(editor)
  },
  
  // Search Page Object
  search: async ({ page }, use) => {
    const search = new SearchPage(page)
    await use(search)
  },
  
  // Version Selector Page Object
  versionSelector: async ({ page }, use) => {
    const versionSelector = new VersionSelectorPage(page)
    await use(versionSelector)
  },
  
  // 测试数据
  testData: async ({}, use) => {
    const timestamp = Date.now()
    const testData: TestData = {
      projectName: `测试项目_${timestamp}`,
      folderName: `测试文件夹_${timestamp}`,
      content: `# 测试 Prompt\n\n这是测试内容，创建于 ${new Date().toLocaleString()}`,
      versionDescription: `测试版本描述_${timestamp}`,
    }
    await use(testData)
  },
})

// 重新导出 expect
export { expect }

// 导出常用的测试辅助函数
export async function waitForAppReady(page: Page) {
  // 等待应用加载完成（Loading 消失）
  await page.waitForSelector('text=Loading workspace', { state: 'hidden', timeout: 30000 }).catch(() => {
    // 可能已经加载完成，忽略错误
  })
  
  // 等待项目面板可见
  await page.waitForSelector('text=Prompt管家', { timeout: 10000 })
}

export async function clearIndexedDB(page: Page) {
  // 仅清除测试数据库，不影响真实数据
  await page.evaluate(async () => {
    indexedDB.deleteDatabase('PromptWorkbench_Test')
  })
}

export async function reloadAndWait(page: Page) {
  // 等待 structure.json 同步完成（syncStructureToLocal 延迟 100ms + 写入时间）
  await page.waitForTimeout(1500)
  await page.reload()
  await waitForAppReady(page)
  // 等待 API 调用完成
  await page.waitForResponse(resp => resp.url().includes('/api/load-local'), { timeout: 10000 }).catch(() => {})
  // 额外等待数据加载和渲染完成
  await page.waitForTimeout(1000)
}

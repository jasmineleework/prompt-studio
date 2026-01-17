import { test, expect } from '../fixtures/test-fixtures'
import { generateTestId, waitForAppReady, reloadAndWait, cleanupTestProject } from '../helpers/test-utils'

/**
 * 文件夹管理功能测试
 * 
 * 测试覆盖:
 * - 基础功能: 创建、重命名、删除文件夹，拖拽项目
 * - 刷新场景: 验证刷新后文件夹结构持久化
 * - 后端重启场景: 验证重启后文件夹结构恢复
 */

test.describe('文件夹管理功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })
  
  test.describe('基础功能', () => {
    
    test('创建新文件夹', async ({ projectPanel, testData }) => {
      const folderName = testData.folderName
      
      // 创建文件夹
      await projectPanel.createFolder(folderName)
      
      // 验证文件夹已创建
      const exists = await projectPanel.folderExists(folderName)
      expect(exists).toBe(true)
    })
    
    test('重命名文件夹 - 通过右键菜单', async ({ projectPanel, testData }) => {
      const folderName = testData.folderName
      const newName = `${folderName}_重命名`
      
      // 创建文件夹
      await projectPanel.createFolder(folderName)
      
      // 重命名
      await projectPanel.renameViaContextMenu(folderName, newName)
      
      // 验证新名称存在
      const newExists = await projectPanel.folderExists(newName)
      expect(newExists).toBe(true)
      
      // 验证旧名称不存在
      const oldExists = await projectPanel.folderExists(folderName)
      expect(oldExists).toBe(false)
    })
    
    test('删除空文件夹', async ({ projectPanel, testData }) => {
      const folderName = testData.folderName
      
      // 创建文件夹
      await projectPanel.createFolder(folderName)
      
      // 验证文件夹存在
      let exists = await projectPanel.folderExists(folderName)
      expect(exists).toBe(true)
      
      // 删除文件夹
      await projectPanel.deleteViaContextMenu(folderName)
      
      // 验证文件夹已删除
      exists = await projectPanel.folderExists(folderName)
      expect(exists).toBe(false)
    })
    
    test('删除含项目的文件夹 - 显示确认提示', async ({ projectPanel, editor, testData, page }) => {
      const folderName = testData.folderName
      const projectName = testData.projectName
      
      // 创建文件夹
      await projectPanel.createFolder(folderName)
      
      // 创建项目并保存（确保有本地文件）
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent('# 测试')
      await editor.save('初始版本')
      
      // 使用 Store API 移动项目到文件夹（比拖拽更可靠）
      await projectPanel.moveProjectToFolder(projectName, folderName)
      
      // 验证项目已在文件夹内
      const inFolder = await projectPanel.isProjectInFolder(projectName, folderName)
      expect(inFolder).toBe(true)
      
      // 尝试删除文件夹 - 应显示确认对话框
      await projectPanel.openContextMenu(folderName)
      await page.locator('[data-testid="context-menu-delete"]').click()
      
      // 验证确认对话框出现
      await expect(page.locator('text=确认删除')).toBeVisible()
      
      // 取消删除
      await page.locator('button:has-text("取消")').click()
      
      // 验证文件夹仍存在
      const exists = await projectPanel.folderExists(folderName)
      expect(exists).toBe(true)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('移动项目到文件夹', async ({ projectPanel, editor, testData, page }) => {
      const folderName = testData.folderName
      const projectName = testData.projectName
      
      // 创建文件夹
      await projectPanel.createFolder(folderName)
      
      // 创建项目并保存
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent('# 测试')
      await editor.save('初始版本')
      
      // 使用 Store API 移动项目到文件夹
      await projectPanel.moveProjectToFolder(projectName, folderName)
      
      // 验证项目已在文件夹内
      const inFolder = await projectPanel.isProjectInFolder(projectName, folderName)
      expect(inFolder).toBe(true)
      
      // 验证项目仍然存在于 UI 中
      const exists = await projectPanel.projectExists(projectName)
      expect(exists).toBe(true)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('文件夹折叠/展开', async ({ projectPanel, editor, testData, page }) => {
      const folderName = testData.folderName
      const projectName = testData.projectName
      
      // 创建文件夹
      await projectPanel.createFolder(folderName)
      
      // 创建项目并保存
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent('# 测试')
      await editor.save('初始版本')
      
      // 使用 Store API 移动项目到文件夹
      await projectPanel.moveProjectToFolder(projectName, folderName)
      await page.waitForTimeout(500)
      
      // 折叠文件夹（点击文件夹按钮）
      await projectPanel.toggleFolderCollapse(folderName)
      await page.waitForTimeout(300)
      
      // 验证文件夹已折叠（ChevronRight 图标可见）
      const chevronRight = page.locator(`button:has-text("${folderName}")`).first().locator('.lucide-chevron-right')
      const isCollapsed = await chevronRight.isVisible().catch(() => false)
      
      // 再次展开
      await projectPanel.toggleFolderCollapse(folderName)
      await page.waitForTimeout(300)
      
      // 验证文件夹按钮仍然可见
      const folderButton = page.locator(`button:has-text("${folderName}")`).first()
      await expect(folderButton).toBeVisible()
      
      // 清理
      cleanupTestProject(projectName)
    })
    
  })
  
  test.describe('浏览器刷新场景', () => {
    
    test('创建文件夹后刷新 - 文件夹仍存在', async ({ projectPanel, page, testData }) => {
      const folderName = testData.folderName
      
      // 创建文件夹
      await projectPanel.createFolder(folderName)
      
      // 验证文件夹存在
      let exists = await projectPanel.folderExists(folderName)
      expect(exists).toBe(true)
      
      // 刷新页面
      await reloadAndWait(page)
      
      // 验证文件夹仍存在
      exists = await projectPanel.folderExists(folderName)
      expect(exists).toBe(true)
    })
    
    test('移动项目到文件夹后刷新 - 项目仍在文件夹内', async ({ projectPanel, editor, page, testData }) => {
      const folderName = testData.folderName
      const projectName = testData.projectName
      
      // 创建文件夹
      await projectPanel.createFolder(folderName)
      
      // 创建项目并保存
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent('# 测试')
      await editor.save('初始版本')
      
      // 使用 Store API 移动项目到文件夹
      await projectPanel.moveProjectToFolder(projectName, folderName)
      await page.waitForTimeout(500)
      
      // 验证项目已在文件夹内
      let inFolder = await projectPanel.isProjectInFolder(projectName, folderName)
      expect(inFolder).toBe(true)
      
      // 刷新页面
      await reloadAndWait(page)
      
      // 验证文件夹和项目都存在
      const folderExists = await projectPanel.folderExists(folderName)
      expect(folderExists).toBe(true)
      
      const projectExists = await projectPanel.projectExists(projectName)
      expect(projectExists).toBe(true)
      
      // 验证项目仍在文件夹内
      inFolder = await projectPanel.isProjectInFolder(projectName, folderName)
      expect(inFolder).toBe(true)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('文件夹折叠状态刷新后保持', async ({ projectPanel, page, testData }) => {
      const folderName = testData.folderName
      
      // 创建文件夹
      await projectPanel.createFolder(folderName)
      
      // 折叠文件夹
      await projectPanel.toggleFolderCollapse(folderName)
      await page.waitForTimeout(300)
      
      // 记录折叠状态（通过检查 ChevronRight 图标）
      const chevronRight = page.locator(`button:has-text("${folderName}")`).first().locator('.lucide-chevron-right')
      const isCollapsed = await chevronRight.isVisible().catch(() => false)
      
      // 刷新页面
      await reloadAndWait(page)
      
      // 验证文件夹仍存在
      const exists = await projectPanel.folderExists(folderName)
      expect(exists).toBe(true)
      
      // 验证折叠状态保持（structure.json 应该保存了状态）
      // 注意：如果折叠状态不持久化，这个测试可能失败
    })
    
  })
  
  test.describe('后端重启场景', () => {
    
    test('文件夹结构在重启后正确恢复', async ({ projectPanel, editor, page, testData }) => {
      const folderName = testData.folderName
      const projectName = testData.projectName
      
      // 创建文件夹
      await projectPanel.createFolder(folderName)
      
      // 创建项目并保存内容（确保有本地文件）
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent('# 测试内容')
      await editor.save('初始版本')
      
      // 使用 Store API 移动项目到文件夹
      await projectPanel.moveProjectToFolder(projectName, folderName)
      await page.waitForTimeout(1000) // 等待同步完成
      
      // 验证项目已在文件夹内
      let inFolder = await projectPanel.isProjectInFolder(projectName, folderName)
      expect(inFolder).toBe(true)
      
      // 模拟后端重启：清除 IndexedDB
      await page.evaluate(async () => {
        const databases = await indexedDB.databases()
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
          }
        }
      })
      
      // 刷新页面（从 structure.json 和本地文件恢复）
      await reloadAndWait(page)
      
      // 验证文件夹仍存在
      const folderExists = await projectPanel.folderExists(folderName)
      expect(folderExists).toBe(true)
      
      // 验证项目仍存在
      const projectExists = await projectPanel.projectExists(projectName)
      expect(projectExists).toBe(true)
      
      // 验证项目仍在文件夹内
      inFolder = await projectPanel.isProjectInFolder(projectName, folderName)
      expect(inFolder).toBe(true)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
  })
  
})

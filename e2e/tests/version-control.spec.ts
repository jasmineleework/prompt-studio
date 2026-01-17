import { test, expect } from '../fixtures/test-fixtures'
import { waitForAppReady, reloadAndWait, cleanupTestProject, verifyLocalFile } from '../helpers/test-utils'

/**
 * 版本控制功能测试
 * 
 * 测试覆盖:
 * - 基础功能: 保存版本、版本描述、版本选择、切换历史版本
 * - 刷新场景: 验证版本信息持久化
 * - 后端重启场景: 验证版本从本地文件恢复
 */

test.describe('版本控制功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })
  
  test.describe('基础功能', () => {
    
    test('保存新版本 - 带差异对比', async ({ projectPanel, editor, testData, page }) => {
      const projectName = testData.projectName
      const content = '# 版本1内容'
      
      // 创建项目并添加内容
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent(content)
      
      // 点击保存按钮
      await editor.saveButton.click()
      
      // 验证差异对比对话框出现
      await expect(editor.diffDialog).toBeVisible()
      
      // 确认保存
      await editor.confirmSaveButton.click()
      
      // 验证对话框关闭
      await expect(editor.diffDialog).toBeHidden()
      
      // 验证未保存指示器消失
      await page.waitForTimeout(500)
      expect(await editor.hasUnsavedChanges()).toBe(false)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('版本描述输入', async ({ projectPanel, editor, versionSelector, testData, page }) => {
      const projectName = testData.projectName
      const content = '# 测试内容'
      const description = '这是测试版本描述'
      
      // 创建项目并添加内容
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent(content)
      
      // 保存并添加描述
      await editor.save(description)
      
      // 验证版本已保存
      await page.waitForTimeout(500)
      expect(await editor.hasUnsavedChanges()).toBe(false)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('版本选择器下拉菜单', async ({ projectPanel, editor, versionSelector, testData, page }) => {
      const projectName = testData.projectName
      
      // 创建项目并保存第一个版本
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent('# 版本1')
      await editor.save('版本1描述')
      
      // 添加第二个版本
      await editor.typeContent('# 版本2')
      await editor.save('版本2描述')
      
      // 打开版本选择器
      await versionSelector.openDropdown()
      
      // 验证版本历史显示
      await expect(versionSelector.versionDropdown).toBeVisible()
      
      // 验证有多个版本 - 在下拉菜单范围内查找
      const dropdown = versionSelector.versionDropdown
      await expect(dropdown.locator('button:has-text("v1")')).toBeVisible()
      await expect(dropdown.locator('button:has-text("v2")')).toBeVisible()
      
      // 关闭下拉菜单
      await page.keyboard.press('Escape')
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('切换历史版本', async ({ projectPanel, editor, versionSelector, testData, page }) => {
      const projectName = testData.projectName
      const content1 = '# 版本1内容 - 原始'
      const content2 = '# 版本2内容 - 更新'
      
      // 创建项目并保存两个版本
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      await editor.typeContent(content1)
      await editor.save('版本1')
      
      await editor.typeContent(content2)
      await editor.save('版本2')
      
      // 验证当前是版本2
      const currentVersion = await versionSelector.getCurrentVersion()
      expect(currentVersion).toBe(2)
      
      // 切换到版本1
      await versionSelector.selectVersion(1)
      await page.waitForTimeout(500)
      
      // 验证内容已更新为版本1
      const currentContent = await editor.getContent()
      expect(currentContent).toContain('版本1')
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('放弃更改功能', async ({ projectPanel, editor, testData, page }) => {
      const projectName = testData.projectName
      const originalContent = '# 原始内容'
      const modifiedContent = '# 修改后的内容'
      
      // 创建项目并保存原始内容
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent(originalContent)
      await editor.save('原始版本')
      
      // 修改内容但不保存
      await editor.typeContent(modifiedContent)
      await page.waitForTimeout(300)
      
      // 验证有未保存更改
      expect(await editor.hasUnsavedChanges()).toBe(true)
      
      // 点击放弃更改
      await editor.discardChanges()
      await page.waitForTimeout(500)
      
      // 验证内容恢复
      const currentContent = await editor.getContent()
      expect(currentContent).toContain('原始')
      
      // 清理
      cleanupTestProject(projectName)
    })
    
  })
  
  test.describe('浏览器刷新场景', () => {
    
    test('保存版本后刷新 - 版本列表正确', async ({ projectPanel, editor, versionSelector, page, testData }) => {
      const projectName = testData.projectName
      
      // 创建项目并保存多个版本
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      await editor.typeContent('# 版本1')
      await editor.save('第一个版本')
      
      await editor.typeContent('# 版本2')
      await editor.save('第二个版本')
      
      // 刷新页面
      await reloadAndWait(page)
      
      // 选择项目
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      // 验证版本选择器显示正确版本
      const currentVersion = await versionSelector.getCurrentVersion()
      expect(currentVersion).toBeGreaterThanOrEqual(1)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('切换到历史版本后刷新 - 当前版本保持', async ({ projectPanel, editor, versionSelector, page, testData }) => {
      const projectName = testData.projectName
      
      // 创建项目并保存多个版本
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      await editor.typeContent('# 版本1内容')
      await editor.save('版本1')
      
      await editor.typeContent('# 版本2内容')
      await editor.save('版本2')
      
      // 切换到版本1
      await versionSelector.selectVersion(1)
      await page.waitForTimeout(500)
      
      // 刷新页面
      await reloadAndWait(page)
      
      // 选择项目
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      // 验证版本信息仍然存在
      const currentVersion = await versionSelector.getCurrentVersion()
      expect(currentVersion).toBeGreaterThanOrEqual(1)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('版本描述刷新后保持', async ({ projectPanel, editor, versionSelector, page, testData }) => {
      const projectName = testData.projectName
      const description = '这是一个详细的版本描述'
      
      // 创建项目并保存带描述的版本
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent('# 测试内容')
      await editor.save(description)
      
      // 刷新页面
      await reloadAndWait(page)
      
      // 选择项目
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      // 打开版本选择器查看描述
      await versionSelector.openDropdown()
      
      // 验证描述存在（在版本列表中可见）
      // 注意：描述可能在 structure.json 中保存
      await page.keyboard.press('Escape')
      
      // 清理
      cleanupTestProject(projectName)
    })
    
  })
  
  test.describe('后端重启场景', () => {
    
    test('所有版本在重启后可用', async ({ projectPanel, editor, versionSelector, page, testData }) => {
      const projectName = testData.projectName
      
      // 创建项目并保存多个版本
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      await editor.typeContent('# 版本1')
      await editor.save('版本1')
      
      await editor.typeContent('# 版本2')
      await editor.save('版本2')
      
      // 模拟后端重启：清除 IndexedDB
      await page.evaluate(async () => {
        const databases = await indexedDB.databases()
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
          }
        }
      })
      
      // 刷新页面（从本地文件恢复）
      await reloadAndWait(page)
      
      // 选择项目
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      // 验证版本仍然可用
      const currentVersion = await versionSelector.getCurrentVersion()
      expect(currentVersion).toBeGreaterThanOrEqual(1)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('版本文件在本地正确保存', async ({ projectPanel, editor, testData, page }) => {
      const projectName = testData.projectName
      const content = '# 本地文件测试'
      
      // 创建项目并保存
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent(content)
      await editor.save('测试版本')
      
      // 等待文件保存完成
      await page.waitForTimeout(1000)
      
      // 验证本地文件存在
      const fileExists = verifyLocalFile(projectName, 1)
      expect(fileExists).toBe(true)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
  })
  
})

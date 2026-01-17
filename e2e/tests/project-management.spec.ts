import { test, expect } from '../fixtures/test-fixtures'
import { generateTestId, waitForAppReady, reloadAndWait, cleanupTestProject } from '../helpers/test-utils'

/**
 * 项目管理功能测试
 * 
 * 测试覆盖:
 * - 基础功能: 创建、选择、重命名、删除项目
 * - 刷新场景: 验证刷新后数据持久化
 * - 后端重启场景: 验证重启后数据恢复
 */

test.describe('项目管理功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })
  
  test.describe('基础功能', () => {
    
    test('创建新项目 - 输入名称后按 Enter 确认', async ({ projectPanel, testData }) => {
      const projectName = testData.projectName
      
      // 创建项目
      await projectPanel.createProject(projectName)
      
      // 验证项目已创建
      const exists = await projectPanel.projectExists(projectName)
      expect(exists).toBe(true)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('创建新项目 - 空名称不应创建', async ({ projectPanel, page }) => {
      // 点击新建项目按钮
      await projectPanel.newProjectButton.click()
      
      // 直接按 Enter（不输入名称）
      await projectPanel.projectInput.press('Enter')
      
      // 验证输入框仍然存在（未创建项目）
      const inputStillVisible = await projectPanel.projectInput.isVisible()
      expect(inputStillVisible).toBe(true)
      
      // 按 Escape 取消
      await projectPanel.projectInput.press('Escape')
    })
    
    test('选择项目 - 点击项目名称', async ({ projectPanel, editor, testData }) => {
      const projectName = testData.projectName
      
      // 创建项目
      await projectPanel.createProject(projectName)
      
      // 选择项目
      await projectPanel.selectProject(projectName)
      
      // 验证编辑器已加载
      await editor.waitForEditorReady()
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('重命名项目 - 通过右键菜单', async ({ projectPanel, testData, page }) => {
      const projectName = testData.projectName
      const newName = `${projectName}_重命名`
      
      // 创建项目
      await projectPanel.createProject(projectName)
      
      // 重命名
      await projectPanel.renameViaContextMenu(projectName, newName)
      
      // 验证新名称存在
      const newExists = await projectPanel.projectExists(newName)
      expect(newExists).toBe(true)
      
      // 验证旧名称不存在
      const oldExists = await projectPanel.projectExists(projectName)
      expect(oldExists).toBe(false)
      
      // 清理
      cleanupTestProject(newName)
    })
    
    test('删除项目 - 通过右键菜单和确认对话框', async ({ projectPanel, testData }) => {
      const projectName = testData.projectName
      
      // 创建项目
      await projectPanel.createProject(projectName)
      
      // 验证项目存在
      let exists = await projectPanel.projectExists(projectName)
      expect(exists).toBe(true)
      
      // 删除项目
      await projectPanel.deleteViaContextMenu(projectName)
      
      // 验证项目已删除
      exists = await projectPanel.projectExists(projectName)
      expect(exists).toBe(false)
    })
    
    test('重复项目名称验证', async ({ projectPanel, testData, page }) => {
      const projectName = testData.projectName
      
      // 创建第一个项目
      await projectPanel.createProject(projectName)
      
      // 尝试创建同名项目
      await projectPanel.newProjectButton.click()
      await projectPanel.projectInput.fill(projectName)
      await projectPanel.projectInput.press('Enter')
      
      // 应该显示错误提示（alert）
      // 注意：这里可能需要处理 dialog
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('已存在')
        await dialog.accept()
      })
      
      // 清理
      cleanupTestProject(projectName)
    })
    
  })
  
  test.describe('浏览器刷新场景', () => {
    
    test('创建项目后刷新 - 项目仍存在', async ({ projectPanel, editor, page, testData }) => {
      const projectName = testData.projectName
      
      // 创建项目并保存内容（确保有本地文件）
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent('# 测试内容')
      await editor.save('初始版本')
      
      // 验证项目存在
      let exists = await projectPanel.projectExists(projectName)
      expect(exists).toBe(true)
      
      // 刷新页面
      await reloadAndWait(page)
      
      // 验证项目仍存在
      exists = await projectPanel.projectExists(projectName)
      expect(exists).toBe(true)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('重命名项目后刷新 - 名称已更新', async ({ projectPanel, editor, page, testData }) => {
      const projectName = testData.projectName
      const newName = `${projectName}_已重命名`
      
      // 创建项目并保存内容
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent('# 测试')
      await editor.save('初始版本')
      
      // 重命名
      await projectPanel.renameViaContextMenu(projectName, newName)
      
      // 刷新页面
      await reloadAndWait(page)
      
      // 验证新名称存在
      const newExists = await projectPanel.projectExists(newName)
      expect(newExists).toBe(true)
      
      // 验证旧名称不存在
      const oldExists = await projectPanel.projectExists(projectName)
      expect(oldExists).toBe(false)
      
      // 清理
      cleanupTestProject(newName)
    })
    
    test('删除项目后刷新 - 项目已删除', async ({ projectPanel, page, testData }) => {
      const projectName = testData.projectName
      
      // 创建项目
      await projectPanel.createProject(projectName)
      
      // 删除项目
      await projectPanel.deleteViaContextMenu(projectName)
      
      // 刷新页面
      await reloadAndWait(page)
      
      // 验证项目仍不存在
      const exists = await projectPanel.projectExists(projectName)
      expect(exists).toBe(false)
    })
    
    test('多个项目创建后刷新 - 所有项目都存在', async ({ projectPanel, editor, page }) => {
      const projects = [
        generateTestId('项目A'),
        generateTestId('项目B'),
        generateTestId('项目C')
      ]
      
      // 创建多个项目并保存内容（确保有本地文件）
      for (const name of projects) {
        await projectPanel.createProject(name)
        await projectPanel.selectProject(name)
        await editor.waitForEditorReady()
        await editor.typeContent(`# ${name}`)
        await editor.save('初始版本')
      }
      
      // 刷新页面
      await reloadAndWait(page)
      
      // 验证所有项目都存在
      for (const name of projects) {
        const exists = await projectPanel.projectExists(name)
        expect(exists).toBe(true)
      }
      
      // 清理
      for (const name of projects) {
        cleanupTestProject(name)
      }
    })
    
  })
  
  test.describe('后端重启场景', () => {
    
    test('创建项目后重启后端 - 项目从本地文件恢复', async ({ projectPanel, editor, page, testData }) => {
      const projectName = testData.projectName
      const content = testData.content
      
      // 创建项目
      await projectPanel.createProject(projectName)
      
      // 选择项目并添加内容
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent(content)
      
      // 保存版本（触发本地文件保存）
      await editor.save('初始版本')
      
      // 模拟后端重启：清除 IndexedDB 后刷新
      // 这模拟了后端重启后 IndexedDB 被清空但本地文件仍在的情况
      await page.evaluate(async () => {
        const databases = await indexedDB.databases()
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
          }
        }
      })
      
      // 刷新页面（触发从本地文件恢复）
      await reloadAndWait(page)
      
      // 验证项目仍存在（从本地文件恢复）
      const exists = await projectPanel.projectExists(projectName)
      expect(exists).toBe(true)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
  })
  
})

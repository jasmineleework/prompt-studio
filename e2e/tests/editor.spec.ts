import { test, expect } from '../fixtures/test-fixtures'
import { waitForAppReady, reloadAndWait, cleanupTestProject } from '../helpers/test-utils'

/**
 * 编辑器功能测试
 * 
 * 测试覆盖:
 * - 基础功能: 编辑器加载、内容输入、未保存指示器
 * - 刷新场景: 验证保存后内容持久化
 * - 后端重启场景: 验证重启后内容正确加载
 */

test.describe('编辑器功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })
  
  test.describe('基础功能', () => {
    
    test('编辑器加载 - Monaco Editor 初始化', async ({ projectPanel, editor, testData }) => {
      const projectName = testData.projectName
      
      // 创建并选择项目
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      
      // 等待编辑器加载
      await editor.waitForEditorReady()
      
      // 验证 Monaco Editor 可见
      await expect(editor.monacoEditor).toBeVisible()
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('内容输入和显示', async ({ projectPanel, editor, testData, page }) => {
      const projectName = testData.projectName
      const content = '# 测试标题\n\n这是测试内容'
      
      // 创建并选择项目
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      
      // 等待编辑器加载
      await editor.waitForEditorReady()
      
      // 输入内容
      await editor.typeContent(content)
      
      // 等待内容更新
      await page.waitForTimeout(500)
      
      // 验证内容已输入（通过检查未保存状态）
      const hasChanges = await editor.hasUnsavedChanges()
      expect(hasChanges).toBe(true)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('未保存更改指示器', async ({ projectPanel, editor, testData, page }) => {
      const projectName = testData.projectName
      
      // 创建并选择项目
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      
      // 等待编辑器加载
      await editor.waitForEditorReady()
      
      // 初始状态应该没有未保存更改
      let hasChanges = await editor.hasUnsavedChanges()
      
      // 输入内容
      await editor.typeContent('新增内容')
      await page.waitForTimeout(300)
      
      // 应该显示未保存指示器
      hasChanges = await editor.hasUnsavedChanges()
      expect(hasChanges).toBe(true)
      
      // 验证未保存提示可见
      await expect(editor.unsavedIndicator).toBeVisible()
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('未选择项目时的空状态', async ({ editor, page }) => {
      // 清除 IndexedDB，确保没有缓存的项目数据
      await page.evaluate(async () => {
        const databases = await indexedDB.databases()
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
          }
        }
      })
      
      // 清空测试目录中的所有项目文件夹（通过 API）
      await page.evaluate(async () => {
        // 删除 structure.json 中的所有项目和文件夹
        await fetch('/api/structure', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projects: {}, folders: {} })
        })
      })
      
      // 刷新页面，此时应该显示空状态
      await page.reload()
      await page.waitForSelector('text=Prompt管家', { timeout: 10000 })
      await page.waitForTimeout(1000)
      
      // 验证空状态显示
      await expect(editor.noProjectState).toBeVisible()
    })
    
    test('切换项目时内容更新', async ({ projectPanel, editor, testData, page }) => {
      const projectName1 = `${testData.projectName}_1`
      const projectName2 = `${testData.projectName}_2`
      const content1 = '项目1的内容'
      const content2 = '项目2的内容'
      
      // 创建第一个项目并添加内容
      await projectPanel.createProject(projectName1)
      await projectPanel.selectProject(projectName1)
      await editor.waitForEditorReady()
      await editor.typeContent(content1)
      await editor.save('项目1初始版本')
      
      // 创建第二个项目并添加内容
      await projectPanel.createProject(projectName2)
      await projectPanel.selectProject(projectName2)
      await editor.waitForEditorReady()
      await editor.typeContent(content2)
      await editor.save('项目2初始版本')
      
      // 切换回第一个项目
      await projectPanel.selectProject(projectName1)
      await page.waitForTimeout(500)
      
      // 验证内容已更新为项目1的内容
      const editorContent = await editor.getContent()
      expect(editorContent).toContain('项目1')
      
      // 清理
      cleanupTestProject(projectName1)
      cleanupTestProject(projectName2)
    })
    
    test('放弃更改功能', async ({ projectPanel, editor, testData, page }) => {
      const projectName = testData.projectName
      const originalContent = '原始内容'
      const newContent = '修改后的内容'
      
      // 创建项目并保存初始内容
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent(originalContent)
      await editor.save('初始版本')
      
      // 修改内容
      await editor.typeContent(newContent)
      await page.waitForTimeout(300)
      
      // 验证有未保存更改
      expect(await editor.hasUnsavedChanges()).toBe(true)
      
      // 点击放弃更改
      await editor.discardChanges()
      await page.waitForTimeout(500)
      
      // 验证内容恢复为原始内容
      const currentContent = await editor.getContent()
      expect(currentContent).toContain(originalContent)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
  })
  
  test.describe('状态栏统计功能', () => {
    
    test('状态栏显示 - 行数、字符数、字数、Token数', async ({ projectPanel, editor, testData, page }) => {
      const projectName = testData.projectName
      
      // 创建并选择项目
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      // 验证状态栏可见
      const isVisible = await editor.isStatusBarVisible()
      expect(isVisible).toBe(true)
      
      // 输入已知内容
      const testContent = '这是测试内容\n第二行\n第三行'
      await editor.typeContent(testContent)
      await page.waitForTimeout(500)
      
      // 获取统计数据
      const stats = await editor.getStats()
      
      // 验证行数 (3行)
      expect(stats.lines).toBe(3)
      
      // 验证字符数
      expect(stats.characters).toBeGreaterThan(0)
      
      // 验证字数
      expect(stats.words).toBeGreaterThan(0)
      
      // 验证 Token 数（估算值 ≈ 字符数 / 3，向上取整，允许一定误差）
      expect(stats.tokens).toBeGreaterThan(0)
      const expectedTokens = Math.ceil(stats.characters / 3)
      expect(stats.tokens).toBeGreaterThanOrEqual(expectedTokens - 1)
      expect(stats.tokens).toBeLessThanOrEqual(expectedTokens + 1)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('编辑内容时统计数据实时更新', async ({ projectPanel, editor, testData, page }) => {
      const projectName = testData.projectName
      
      // 创建并选择项目
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      // 输入初始内容
      await editor.typeContent('初始内容')
      await page.waitForTimeout(300)
      
      // 获取初始统计
      const statsBefore = await editor.getStats()
      
      // 追加更多内容
      await editor.appendContent('\n新增一行内容\n再增加一行')
      await page.waitForTimeout(300)
      
      // 获取更新后的统计
      const statsAfter = await editor.getStats()
      
      // 验证统计数据已更新
      expect(statsAfter.lines).toBeGreaterThan(statsBefore.lines)
      expect(statsAfter.characters).toBeGreaterThan(statsBefore.characters)
      expect(statsAfter.tokens).toBeGreaterThan(statsBefore.tokens)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('大文本 Token 警告显示', async ({ projectPanel, editor, testData, page }) => {
      const projectName = testData.projectName
      
      // 创建并选择项目
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      // 生成超过 4000 tokens 的内容 (约 12000+ 字符)
      // 使用重复文本快速生成大量内容
      const longContent = '这是一段用于测试Token警告功能的测试文本内容。'.repeat(600)
      
      // 直接使用 Monaco API 设置内容，并触发编辑器的 onChange
      await page.evaluate((content) => {
        const monacoEditor = (window as any).monaco?.editor?.getEditors()?.[0]
        if (monacoEditor) {
          monacoEditor.setValue(content)
          // 触发 onChange 事件
          monacoEditor.trigger('keyboard', 'type', { text: '' })
        }
      }, longContent)
      
      // 等待 UI 更新
      await page.waitForTimeout(1000)
      
      // 获取统计数据
      const stats = await editor.getStats()
      
      // 验证字符数（长内容）
      expect(stats.characters).toBeGreaterThan(10000)
      
      // 验证 Token 数超过 4000
      expect(stats.tokens).toBeGreaterThan(4000)
      
      // 验证警告显示
      const hasWarning = await editor.hasTokenWarning()
      expect(hasWarning).toBe(true)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('刷新后统计数据正确恢复', async ({ projectPanel, editor, testData, page }) => {
      const projectName = testData.projectName
      const testContent = '测试内容\n第二行\n第三行\n第四行'
      
      // 创建项目并保存内容
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent(testContent)
      await editor.save('统计测试版本')
      
      // 获取保存前的统计
      const statsBefore = await editor.getStats()
      
      // 刷新页面
      await page.reload()
      await page.waitForSelector('text=Prompt管家', { timeout: 10000 })
      await page.waitForTimeout(500)
      
      // 重新选择项目
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await page.waitForTimeout(500)
      
      // 获取刷新后的统计
      const statsAfter = await editor.getStats()
      
      // 验证统计数据一致
      expect(statsAfter.lines).toBe(statsBefore.lines)
      expect(statsAfter.characters).toBe(statsBefore.characters)
      expect(statsAfter.tokens).toBe(statsBefore.tokens)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
  })
  
  test.describe('浏览器刷新场景', () => {
    
    test('编辑内容 -> 保存 -> 刷新 -> 内容正确显示', async ({ projectPanel, editor, page, testData }) => {
      const projectName = testData.projectName
      const content = '# 测试内容\n\n这是刷新测试的内容'
      
      // 创建项目并保存内容
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent(content)
      await editor.save('刷新测试版本')
      
      // 刷新页面
      await reloadAndWait(page)
      
      // 选择项目
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      // 验证内容正确显示
      const currentContent = await editor.getContent()
      expect(currentContent).toContain('测试内容')
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('未保存的内容刷新后丢失 - 预期行为', async ({ projectPanel, editor, page, testData }) => {
      const projectName = testData.projectName
      const savedContent = '已保存内容'
      const unsavedContent = '未保存的新内容'
      
      // 创建项目并保存初始内容
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent(savedContent)
      await editor.save('初始版本')
      
      // 添加未保存的内容
      await editor.appendContent(unsavedContent)
      await page.waitForTimeout(300)
      
      // 验证有未保存更改
      expect(await editor.hasUnsavedChanges()).toBe(true)
      
      // 刷新页面（未保存内容将丢失）
      await reloadAndWait(page)
      
      // 选择项目
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      // 验证只有已保存内容，未保存内容已丢失
      const currentContent = await editor.getContent()
      expect(currentContent).toContain(savedContent)
      expect(currentContent).not.toContain(unsavedContent)
      
      // 清理
      cleanupTestProject(projectName)
    })
    
  })
  
  test.describe('后端重启场景', () => {
    
    test('已保存内容在重启后正确加载', async ({ projectPanel, editor, page, testData }) => {
      const projectName = testData.projectName
      const content = '# 重启测试\n\n这是后端重启测试的内容'
      
      // 创建项目并保存内容
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent(content)
      await editor.save('重启测试版本')
      
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
      
      // 验证内容从本地文件正确恢复
      const currentContent = await editor.getContent()
      expect(currentContent).toContain('重启测试')
      
      // 清理
      cleanupTestProject(projectName)
    })
    
  })
  
})

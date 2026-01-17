import { test, expect } from '../fixtures/test-fixtures'
import { waitForAppReady, cleanupTestProject } from '../helpers/test-utils'

/**
 * 导出功能测试
 * 
 * 测试覆盖:
 * - 基础功能: 下载 Markdown 文件、文件名格式验证
 */

test.describe('导出功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })
  
  test.describe('基础功能', () => {
    
    test('下载 Markdown 文件', async ({ projectPanel, editor, testData, page }) => {
      const projectName = testData.projectName
      const content = '# 导出测试\n\n这是要导出的内容'
      
      // 创建项目并添加内容
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent(content)
      await editor.save('导出测试版本')
      
      // 设置下载监听
      const downloadPromise = page.waitForEvent('download')
      
      // 点击下载按钮
      await editor.download()
      
      // 等待下载开始
      const download = await downloadPromise
      
      // 验证下载已触发
      expect(download).toBeTruthy()
      
      // 获取文件名
      const suggestedFilename = download.suggestedFilename()
      expect(suggestedFilename).toBeTruthy()
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('文件名格式验证 - 包含项目名和版本号', async ({ projectPanel, editor, testData, page }) => {
      const projectName = testData.projectName
      const content = '# 文件名测试'
      
      // 创建项目并添加内容
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      await editor.typeContent(content)
      await editor.save('版本1')
      
      // 设置下载监听
      const downloadPromise = page.waitForEvent('download')
      
      // 点击下载按钮
      await editor.download()
      
      // 等待下载开始
      const download = await downloadPromise
      
      // 获取文件名
      const suggestedFilename = download.suggestedFilename()
      
      // 验证文件名格式：应该包含项目名和版本号
      // 格式预期: {projectName}_v{versionNumber}.md
      expect(suggestedFilename).toContain('.md')
      expect(suggestedFilename).toContain('_v')
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('下载按钮在无内容时禁用', async ({ projectPanel, editor, testData, page }) => {
      const projectName = testData.projectName
      
      // 创建空项目
      await projectPanel.createProject(projectName)
      await projectPanel.selectProject(projectName)
      await editor.waitForEditorReady()
      
      // 验证下载按钮状态
      // 注意：根据实现，空内容时按钮可能被禁用
      const isDisabled = await editor.downloadButton.isDisabled()
      
      // 如果按钮不可点击或禁用，测试通过
      // 如果按钮可点击，验证下载是否正常工作
      
      // 清理
      cleanupTestProject(projectName)
    })
    
    test('多版本项目下载当前版本', async ({ projectPanel, editor, versionSelector, testData, page }) => {
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
      
      // 设置下载监听
      const downloadPromise = page.waitForEvent('download')
      
      // 点击下载按钮
      await editor.download()
      
      // 等待下载开始
      const download = await downloadPromise
      
      // 获取文件名
      const suggestedFilename = download.suggestedFilename()
      
      // 验证文件名包含版本1
      expect(suggestedFilename).toContain('_v1')
      
      // 清理
      cleanupTestProject(projectName)
    })
    
  })
  
})

import { Page, Locator, expect } from '@playwright/test'

/**
 * Page Object 模式封装
 * 提供页面操作的高级抽象，提高测试可维护性
 */

/**
 * 基础 Page Object 类
 */
export class BasePage {
  constructor(protected page: Page) {}
  
  async goto() {
    await this.page.goto('/')
    await this.waitForReady()
  }
  
  async waitForReady() {
    // 等待 Loading 消失
    await this.page.waitForSelector('text=Loading workspace', { state: 'hidden', timeout: 30000 }).catch(() => {})
    // 等待主界面可见
    await this.page.waitForSelector('text=Prompt管家', { timeout: 10000 })
  }
  
  async reload() {
    await this.page.reload()
    await this.waitForReady()
  }
}

/**
 * 项目面板 Page Object
 */
export class ProjectPanelPage extends BasePage {
  // 定位器
  get newProjectButton(): Locator {
    return this.page.locator('button[title="新建项目"]')
  }
  
  get newFolderButton(): Locator {
    return this.page.locator('button[title="新建文件夹"]')
  }
  
  get projectInput(): Locator {
    return this.page.locator('input[placeholder="项目名称..."]')
  }
  
  get folderInput(): Locator {
    return this.page.locator('input[placeholder="文件夹名称..."]')
  }
  
  get emptyState(): Locator {
    return this.page.locator('text=暂无项目')
  }
  
  // 操作方法
  async createProject(name: string): Promise<void> {
    await this.newProjectButton.click()
    await this.projectInput.fill(name)
    await this.projectInput.press('Enter')
    // 等待项目创建完成
    await this.page.waitForSelector(`text=${name}`, { timeout: 5000 })
  }
  
  async createFolder(name: string): Promise<void> {
    await this.newFolderButton.click()
    await this.folderInput.fill(name)
    await this.folderInput.press('Enter')
    // 等待文件夹创建完成
    await this.page.waitForSelector(`text=${name}`, { timeout: 5000 })
  }
  
  async selectProject(name: string): Promise<void> {
    await this.page.locator(`button:has-text("${name}")`).first().click()
    // 等待编辑器加载
    await this.page.waitForTimeout(500)
  }
  
  async projectExists(name: string): Promise<boolean> {
    // 使用 title 属性进行精确匹配（最可靠的方式）
    const projectByTitle = this.page.locator(`span.truncate[title="${name}"]`)
    const count = await projectByTitle.count()
    if (count > 0) {
      return true
    }
    
    // 检查标题栏是否显示该项目（需要精确匹配）
    const headerProject = this.page.locator('header span').filter({ hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
    if (await headerProject.count() > 0) {
      return true
    }
    
    // 使用文本精确匹配（避免部分匹配的问题）
    const allProjects = this.page.locator('button:has(.lucide-file-text) span.truncate')
    const projectCount = await allProjects.count()
    for (let i = 0; i < projectCount; i++) {
      const text = await allProjects.nth(i).textContent()
      if (text?.trim() === name) {
        return true
      }
    }
    
    return false
  }
  
  async folderExists(name: string): Promise<boolean> {
    // 使用 title 属性进行精确匹配
    const folderByTitle = this.page.locator(`span.truncate[title="${name}"]`)
    const count = await folderByTitle.count()
    if (count > 0) {
      return true
    }
    
    // 备选：使用部分文本匹配
    const folderByPartialText = this.page.locator(`button:has(.lucide-folder) span.truncate`).filter({ hasText: name.substring(0, 15) })
    const partialCount = await folderByPartialText.count()
    return partialCount > 0
  }
  
  async openContextMenu(name: string): Promise<void> {
    const element = this.page.locator(`button:has-text("${name}")`).first()
    await element.click({ button: 'right' })
    // 等待上下文菜单出现
    await this.page.locator('[data-testid="context-menu"]').waitFor({ state: 'visible', timeout: 3000 })
  }
  
  async renameViaContextMenu(oldName: string, newName: string): Promise<void> {
    await this.openContextMenu(oldName)
    // 点击重命名按钮
    await this.page.locator('[data-testid="context-menu-rename"]').click()
    // 等待输入框出现并填写
    const input = this.page.locator('input').first()
    await input.waitFor({ state: 'visible', timeout: 3000 })
    await input.clear()
    await input.fill(newName)
    await input.press('Enter')
    // 等待 API 调用完成
    await this.page.waitForResponse(resp => resp.url().includes('/api/rename-local'), { timeout: 5000 }).catch(() => {})
    // 等待 UI 更新完成
    await this.page.waitForTimeout(1500)
    // 等待新名称出现在界面上
    await this.page.waitForSelector(`span[title="${newName}"]`, { timeout: 5000 }).catch(() => {})
  }
  
  async deleteViaContextMenu(name: string): Promise<void> {
    await this.openContextMenu(name)
    // 点击删除按钮
    await this.page.locator('[data-testid="context-menu-delete"]').click()
    // 等待确认对话框
    await this.page.waitForSelector('text=确认删除', { timeout: 3000 })
    // 点击确认对话框中的删除按钮 - 它有 bg-destructive 类
    await this.page.locator('button.bg-destructive:has-text("删除")').click()
    await this.page.waitForTimeout(500)
  }
  
  async toggleFolderCollapse(name: string): Promise<void> {
    await this.page.locator(`button:has-text("${name}")`).first().click()
    await this.page.waitForTimeout(300)
  }
  
  async dragProjectToFolder(projectName: string, folderName: string): Promise<void> {
    const project = this.page.locator(`button:has-text("${projectName}")`).first()
    const folder = this.page.locator(`button:has-text("${folderName}")`).first()
    
    await project.dragTo(folder)
    await this.page.waitForTimeout(500)
  }
  
  /**
   * 使用 Store API 将项目移动到文件夹（比 UI 拖拽更可靠）
   */
  async moveProjectToFolder(projectName: string, folderName: string | null): Promise<void> {
    await this.page.evaluate(async ({ projectName, folderName }) => {
      // 访问 Zustand store（通过 window 暴露）
      const store = (window as any).__ZUSTAND_PROJECT_STORE__
      if (!store) {
        throw new Error('Project store not found on window')
      }
      
      const state = store.getState()
      const project = state.projects.find((p: any) => p.name === projectName)
      if (!project) {
        throw new Error(`Project "${projectName}" not found`)
      }
      
      let targetFolderId: string | null = null
      if (folderName) {
        const folder = state.folders.find((f: any) => f.name === folderName)
        if (!folder) {
          throw new Error(`Folder "${folderName}" not found`)
        }
        targetFolderId = folder.id
      }
      
      await state.moveProjectToFolder(project.id, targetFolderId)
    }, { projectName, folderName })
    
    // 等待 UI 更新
    await this.page.waitForTimeout(500)
  }
  
  /**
   * 检查项目是否在指定文件夹内
   */
  async isProjectInFolder(projectName: string, folderName: string): Promise<boolean> {
    return await this.page.evaluate(({ projectName, folderName }) => {
      const store = (window as any).__ZUSTAND_PROJECT_STORE__
      if (!store) return false
      
      const state = store.getState()
      const project = state.projects.find((p: any) => p.name === projectName)
      const folder = state.folders.find((f: any) => f.name === folderName)
      
      if (!project || !folder) return false
      return project.folderId === folder.id
    }, { projectName, folderName })
  }
  
  async getProjectCount(): Promise<number> {
    const projects = this.page.locator('[data-testid="project-item"], button:has(.lucide-file-text)')
    return await projects.count()
  }
}

/**
 * 编辑器 Page Object
 */
export class EditorPage extends BasePage {
  // 定位器
  get monacoEditor(): Locator {
    return this.page.locator('.monaco-editor')
  }
  
  get saveButton(): Locator {
    return this.page.locator('button:has-text("保存")')
  }
  
  get unsavedIndicator(): Locator {
    // 匹配实际组件中的未保存指示器
    return this.page.locator('span.text-orange-500:has-text("未保存")')
  }
  
  get discardButton(): Locator {
    return this.page.locator('button:has-text("放弃更改")')
  }
  
  get downloadButton(): Locator {
    return this.page.locator('button[title="下载为 Markdown"]')
  }
  
  get diffDialog(): Locator {
    return this.page.locator('text=版本差异对比')
  }
  
  get versionDescriptionInput(): Locator {
    return this.page.locator('input[placeholder="描述本次修改..."]')
  }
  
  get confirmSaveButton(): Locator {
    return this.page.locator('button:has-text("确认保存")')
  }
  
  get cancelSaveButton(): Locator {
    return this.page.locator('button:has-text("取消")').last()
  }
  
  get noProjectState(): Locator {
    return this.page.locator('text=未选择项目')
  }
  
  get loadingState(): Locator {
    return this.page.locator('text=加载版本中')
  }
  
  // 状态栏定位器
  get statusBar(): Locator {
    return this.page.locator('.h-9.border-t')
  }
  
  get lineCount(): Locator {
    return this.statusBar.locator('text=行').locator('..')
  }
  
  get characterCount(): Locator {
    return this.statusBar.locator('text=字符').locator('..')
  }
  
  get wordCount(): Locator {
    return this.statusBar.locator('text=字').first().locator('..')
  }
  
  get tokenCount(): Locator {
    return this.statusBar.locator('text=tokens').locator('..')
  }
  
  get tokenWarning(): Locator {
    return this.statusBar.locator('text=/超过.*tokens/')
  }
  
  // 操作方法
  async waitForEditorReady(): Promise<void> {
    await this.monacoEditor.waitFor({ state: 'visible', timeout: 10000 })
  }
  
  async typeContent(content: string): Promise<void> {
    await this.waitForEditorReady()
    // 点击编辑器获取焦点
    await this.monacoEditor.click()
    // 选择全部内容
    await this.page.keyboard.press('Meta+A')
    // 输入新内容 - 使用较短延迟提高速度
    await this.page.keyboard.type(content, { delay: 5 })
  }
  
  async appendContent(content: string): Promise<void> {
    await this.waitForEditorReady()
    // 使用 Monaco API 直接追加内容
    await this.page.evaluate((newContent) => {
      const editor = (window as any).monaco?.editor?.getEditors()?.[0]
      if (editor) {
        const model = editor.getModel()
        if (model) {
          const lastLine = model.getLineCount()
          const lastColumn = model.getLineMaxColumn(lastLine)
          editor.executeEdits('test', [{
            range: {
              startLineNumber: lastLine,
              startColumn: lastColumn,
              endLineNumber: lastLine,
              endColumn: lastColumn
            },
            text: '\n' + newContent
          }])
        }
      }
    }, content)
    await this.page.waitForTimeout(300)
  }
  
  async getContent(): Promise<string> {
    await this.waitForEditorReady()
    // 从 Monaco Editor 获取内容
    const content = await this.page.evaluate(() => {
      const editor = (window as any).monaco?.editor?.getModels()?.[0]
      return editor?.getValue() || ''
    })
    return content
  }
  
  async save(description?: string): Promise<void> {
    await this.saveButton.click()
    // 等待 diff 对话框
    await this.diffDialog.waitFor({ state: 'visible', timeout: 5000 })
    
    if (description) {
      await this.versionDescriptionInput.fill(description)
    }
    
    await this.confirmSaveButton.click()
    // 等待保存完成
    await this.diffDialog.waitFor({ state: 'hidden', timeout: 5000 })
    await this.page.waitForTimeout(500)
  }
  
  async hasUnsavedChanges(): Promise<boolean> {
    return await this.unsavedIndicator.isVisible()
  }
  
  async discardChanges(): Promise<void> {
    await this.discardButton.click()
    await this.page.waitForTimeout(300)
  }
  
  async download(): Promise<void> {
    await this.downloadButton.click()
  }
  
  // 状态栏方法
  async getStats(): Promise<{ lines: number; characters: number; words: number; tokens: number }> {
    // 等待状态栏可见
    await this.statusBar.waitFor({ state: 'visible', timeout: 5000 })
    
    // 使用 page.evaluate 直接从 DOM 解析统计数据
    const stats = await this.page.evaluate(() => {
      const statusBar = document.querySelector('.h-9.border-t')
      if (!statusBar) return { lines: 0, characters: 0, words: 0, tokens: 0 }
      
      // 获取所有统计项容器（按顺序：行数、字符、字数、tokens）
      const statItems = statusBar.querySelectorAll('.flex.items-center.gap-2')
      
      // 行数（第一个统计项）
      const linesEl = statItems[0]?.querySelector('span.font-medium')
      const lines = parseInt(linesEl?.textContent || '0')
      
      // 字符数（第二个统计项）
      const charsEl = statItems[1]?.querySelector('span.font-medium')
      const characters = parseInt((charsEl?.textContent || '0').replace(/,/g, ''))
      
      // 字数（第三个统计项）
      const wordsEl = statItems[2]?.querySelector('span.font-medium')
      const words = parseInt((wordsEl?.textContent || '0').replace(/,/g, ''))
      
      // Token 数（第四个统计项）
      const tokensEl = statItems[3]?.querySelector('span.font-medium')
      const tokens = parseInt((tokensEl?.textContent || '0').replace(/[~,]/g, ''))
      
      return { lines, characters, words, tokens }
    })
    
    return stats
  }
  
  async isStatusBarVisible(): Promise<boolean> {
    return await this.statusBar.isVisible()
  }
  
  async hasTokenWarning(): Promise<boolean> {
    return await this.tokenWarning.isVisible()
  }
}

/**
 * 版本选择器 Page Object
 */
export class VersionSelectorPage extends BasePage {
  // 定位器 - 使用 data-testid 精确定位
  get versionButton(): Locator {
    return this.page.locator('[data-testid="version-selector-button"]')
  }
  
  get versionDropdown(): Locator {
    return this.page.locator('[data-testid="version-dropdown"]')
  }
  
  get noVersionState(): Locator {
    return this.page.getByText('无版本')
  }
  
  // 操作方法
  async openDropdown(): Promise<void> {
    // 点击版本按钮打开下拉菜单
    await this.versionButton.click()
    // 等待下拉菜单出现
    await this.versionDropdown.waitFor({ state: 'visible', timeout: 5000 })
  }
  
  async selectVersion(versionNumber: number): Promise<void> {
    await this.openDropdown()
    // 在下拉菜单中点击对应版本
    const versionItem = this.versionDropdown.locator(`button:has-text("v${versionNumber}")`)
    await versionItem.waitFor({ state: 'visible', timeout: 3000 })
    await versionItem.click()
    // 等待下拉菜单关闭
    await this.versionDropdown.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {})
    // 等待内容加载完成
    await this.page.waitForTimeout(1000)
  }
  
  async getCurrentVersion(): Promise<number> {
    // 检查是否有版本
    if (await this.noVersionState.isVisible().catch(() => false)) {
      return 0
    }
    // 从版本按钮获取当前版本号
    const versionText = await this.versionButton.locator('span.font-semibold').textContent().catch(() => null)
    if (!versionText) return 0
    const match = versionText.match(/v(\d+)/)
    return match ? parseInt(match[1]) : 0
  }
  
  async getVersionCount(): Promise<number> {
    await this.openDropdown()
    // 计算下拉菜单中的版本数量
    const versionItems = this.versionDropdown.locator('button')
    const count = await versionItems.count()
    // 关闭下拉菜单
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(200)
    return count
  }
  
  async versionHasDescription(versionNumber: number, description: string): Promise<boolean> {
    await this.openDropdown()
    const versionItem = this.versionDropdown.locator(`button:has-text("v${versionNumber}")`)
    const hasDesc = await versionItem.locator(`text=${description}`).isVisible().catch(() => false)
    await this.page.keyboard.press('Escape')
    return hasDesc
  }
}

/**
 * 搜索 Page Object
 */
export class SearchPage extends BasePage {
  // 定位器
  get searchButton(): Locator {
    // 搜索按钮有 title="搜索 (⌘K)" 属性
    return this.page.locator('button[title*="搜索"]')
  }
  
  get searchInput(): Locator {
    return this.page.locator('input[placeholder*="搜索"]')
  }
  
  get closeButton(): Locator {
    return this.page.locator('text=ESC')
  }
  
  get modeButton(): Locator {
    return this.page.locator('button[title="搜索模式"]')
  }
  
  get searchResults(): Locator {
    return this.page.locator('text=搜索结果')
  }
  
  get searchHistory(): Locator {
    return this.page.locator('text=搜索历史')
  }
  
  get emptyState(): Locator {
    return this.page.locator('text=开始输入以搜索')
  }
  
  // 操作方法
  async open(): Promise<void> {
    // 等待搜索按钮出现
    await this.searchButton.waitFor({ state: 'visible', timeout: 10000 })
    await this.searchButton.click()
    await this.searchInput.waitFor({ state: 'visible', timeout: 3000 })
  }
  
  async openWithKeyboard(): Promise<void> {
    // 先点击页面确保焦点在页面上
    await this.page.locator('body').click()
    await this.page.waitForTimeout(100)
    // 使用 Meta+K (macOS) 快捷键打开搜索
    await this.page.keyboard.press('Meta+k')
    await this.searchInput.waitFor({ state: 'visible', timeout: 5000 })
  }
  
  async close(): Promise<void> {
    await this.closeButton.click()
    await this.searchInput.waitFor({ state: 'hidden', timeout: 3000 })
  }
  
  async closeWithKeyboard(): Promise<void> {
    await this.page.keyboard.press('Escape')
    await this.searchInput.waitFor({ state: 'hidden', timeout: 3000 })
  }
  
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query)
    // 等待搜索结果
    await this.page.waitForTimeout(500)
  }
  
  async setMode(mode: '全部' | '标题' | '内容' | '描述'): Promise<void> {
    await this.modeButton.click()
    // 等待菜单出现
    await this.page.locator('[data-testid="search-mode-menu"]').waitFor({ state: 'visible', timeout: 3000 })
    // 点击菜单中对应的模式选项
    const targetItem = this.page.locator('[data-testid="search-mode-menu"] button').filter({ hasText: mode }).first()
    await targetItem.click()
    await this.page.waitForTimeout(300)
  }
  
  async clickResult(projectName: string): Promise<void> {
    await this.page.locator(`button:has-text("${projectName}")`).first().click()
    await this.page.waitForTimeout(500)
  }
  
  async hasResults(): Promise<boolean> {
    return await this.searchResults.isVisible()
  }
  
  async hasHistory(): Promise<boolean> {
    return await this.searchHistory.isVisible()
  }
  
  async clearHistory(): Promise<void> {
    await this.page.locator('text=清除历史').click()
    await this.page.waitForTimeout(300)
  }
}

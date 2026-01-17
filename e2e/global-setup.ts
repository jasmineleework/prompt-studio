import { FullConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 全局测试设置
 * 在所有测试开始前运行一次
 * 
 * 关键任务：
 * 1. 创建测试专用目录 (prompts-test)
 * 2. 清理上次测试的残留数据
 * 3. 初始化测试环境
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🚀 开始 E2E 测试全局设置...')
  
  // 测试专用目录
  const testPromptsDir = path.join(process.cwd(), 'prompts-test')
  
  // 清理并重新创建测试目录（确保每次测试从干净状态开始）
  if (fs.existsSync(testPromptsDir)) {
    console.log('🧹 清理上次测试数据...')
    fs.rmSync(testPromptsDir, { recursive: true, force: true })
  }
  
  // 创建测试目录
  fs.mkdirSync(testPromptsDir, { recursive: true })
  console.log(`📁 创建测试目录: ${testPromptsDir}`)
  
  // 创建默认的 structure.json
  const defaultStructure = {
    version: "1.0.0",
    folders: [],
    projectMappings: {},
    lastUpdated: new Date().toISOString()
  }
  fs.writeFileSync(
    path.join(testPromptsDir, 'structure.json'),
    JSON.stringify(defaultStructure, null, 2)
  )
  
  // 确保测试输出目录存在
  const outputDir = path.join(__dirname, '..', 'test-results')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // 确保测试报告目录存在
  const reportDir = path.join(__dirname, '..', 'playwright-report')
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }
  
  console.log('✅ 全局设置完成')
  console.log('📋 测试环境：')
  console.log('   - 文件存储: prompts-test/')
  console.log('   - 数据库: PromptWorkbench_Test (IndexedDB)')
  console.log('')
}

export default globalSetup

import { FullConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 全局测试清理
 * 在所有测试完成后运行一次
 * 
 * 注意：默认不删除测试数据，以便调试
 * 设置环境变量 CLEANUP_TEST_DATA=true 可启用自动清理
 */
async function globalTeardown(config: FullConfig) {
  console.log('\n🏁 E2E 测试完成，开始清理...')
  
  const shouldCleanup = process.env.CLEANUP_TEST_DATA === 'true'
  const testPromptsDir = path.join(process.cwd(), 'prompts-test')
  
  if (shouldCleanup) {
    // 清理测试目录
    if (fs.existsSync(testPromptsDir)) {
      fs.rmSync(testPromptsDir, { recursive: true, force: true })
      console.log('🧹 已清理测试目录: prompts-test/')
    }
    console.log('✅ 测试数据已清理')
  } else {
    console.log('💡 测试数据保留在 prompts-test/ 目录')
    console.log('   设置 CLEANUP_TEST_DATA=true 可自动清理')
  }
  
  console.log('')
}

export default globalTeardown

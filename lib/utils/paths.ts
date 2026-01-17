import path from 'path'

/**
 * 获取 prompts 目录路径
 * 
 * 测试环境: prompts-test/
 * 生产环境: prompts/
 */
export function getPromptsDir(): string {
  const isTestEnv = process.env.PLAYWRIGHT_TEST === 'true'
  const dirName = isTestEnv ? 'prompts-test' : 'prompts'
  return path.join(process.cwd(), dirName)
}

/**
 * 获取 structure.json 文件路径
 */
export function getStructureFilePath(): string {
  return path.join(getPromptsDir(), 'structure.json')
}

/**
 * 检查是否为测试环境
 */
export function isTestEnvironment(): boolean {
  return process.env.PLAYWRIGHT_TEST === 'true'
}

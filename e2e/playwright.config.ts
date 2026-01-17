import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 测试配置
 * 
 * 测试数据隔离：
 * - 文件存储: prompts-test/ (不影响真实数据)
 * - 数据库: PromptWorkbench_Test (不影响真实数据库)
 * 
 * 运行命令:
 * - npm run test:e2e              运行所有测试
 * - npm run test:e2e:ui           UI 模式调试
 * - npm run test:e2e:headed       带浏览器界面运行
 * - npm run test:e2e:debug        调试模式（逐步执行）
 * - npm run test:e2e:grep "xxx"   运行匹配的测试
 * - npm run test:e2e:report       查看测试报告
 * - npm run test:e2e:clean        运行并清理测试数据
 */
export default defineConfig({
  // 测试目录
  testDir: './tests',
  
  // 测试文件匹配模式
  testMatch: '**/*.spec.ts',
  
  // 并行执行配置
  fullyParallel: false, // 禁用并行以保证测试顺序
  
  // CI 环境下禁止 .only
  forbidOnly: !!process.env.CI,
  
  // 重试配置
  retries: process.env.CI ? 2 : 0,
  
  // 工作线程数
  workers: 1, // 单线程执行确保测试隔离
  
  // 测试报告 - 详细输出便于调试
  reporter: [
    ['html', { outputFolder: '../playwright-report', open: 'never' }],
    ['list', { printSteps: true }], // 打印每个步骤
  ],
  
  // 全局超时设置
  timeout: 30000,
  
  // 期望超时
  expect: {
    timeout: 5000
  },
  
  // 共享配置
  use: {
    // 基础 URL - 使用测试专用端口
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    
    // 追踪配置 - 失败时保存
    trace: 'on-first-retry',
    
    // 截图配置 - 失败时截图
    screenshot: 'only-on-failure',
    
    // 视频配置 - 失败时录制
    video: 'on-first-retry',
    
    // 浏览器视口
    viewport: { width: 1280, height: 720 },
    
    // 忽略 HTTPS 错误
    ignoreHTTPSErrors: true,
    
    // 操作超时
    actionTimeout: 10000,
    
    // 导航超时
    navigationTimeout: 15000,
  },

  // 项目配置 - 多浏览器支持
  projects: [
    {
      name: 'chrome',
      use: { 
        ...devices['Desktop Chrome'],
        // 使用系统安装的 Chrome 而非 Playwright 下载的 chromium-headless-shell
        // 这样可以避免 macOS 上的进程管理权限问题
        channel: 'chrome',
      },
    },
    // 可选：添加更多浏览器
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Web 服务器配置 - 自动启动开发服务器（测试模式）
  webServer: {
    command: 'PLAYWRIGHT_TEST=true npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: false, // 始终启动新服务器以确保测试环境隔离
    timeout: 120000, // 2分钟启动超时
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      PLAYWRIGHT_TEST: 'true', // 标记测试环境，使用 prompts-test 目录
      PORT: '3001', // 使用不同端口避免与开发服务器冲突
    },
  },
  
  // 全局设置和清理
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  
  // 输出目录
  outputDir: '../test-results',
})

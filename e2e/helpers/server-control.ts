import { exec, spawn, ChildProcess } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * 服务控制器
 * 用于测试后端重启场景
 */
export class ServerControl {
  private serverProcess: ChildProcess | null = null
  private currentPort: number = 3000
  
  /**
   * 获取当前端口
   */
  getPort(): number {
    return this.currentPort
  }
  
  /**
   * 获取当前 URL
   */
  getUrl(): string {
    return `http://localhost:${this.currentPort}`
  }
  
  /**
   * 启动服务器
   */
  async startServer(port: number = 3000): Promise<void> {
    this.currentPort = port
    
    return new Promise((resolve, reject) => {
      console.log(`🚀 Starting server on port ${port}...`)
      
      this.serverProcess = spawn('npm', ['run', 'dev', '--', '-p', String(port)], {
        cwd: process.cwd(),
        env: { ...process.env, PORT: String(port) },
        stdio: 'pipe',
        shell: true
      })
      
      let started = false
      
      this.serverProcess.stdout?.on('data', (data) => {
        const output = data.toString()
        console.log('[Server]', output)
        
        // 检测服务器启动成功
        if (output.includes('Ready') || output.includes('started server')) {
          if (!started) {
            started = true
            console.log(`✅ Server started on port ${port}`)
            resolve()
          }
        }
      })
      
      this.serverProcess.stderr?.on('data', (data) => {
        console.error('[Server Error]', data.toString())
      })
      
      this.serverProcess.on('error', (error) => {
        console.error('Server process error:', error)
        reject(error)
      })
      
      // 超时处理
      setTimeout(() => {
        if (!started) {
          started = true
          // 即使没有检测到启动消息，也假设服务器已启动
          console.log(`⚠️ Server startup timeout, assuming started on port ${port}`)
          resolve()
        }
      }, 30000) // 30 秒超时
    })
  }
  
  /**
   * 停止服务器
   */
  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      console.log('🛑 Stopping server...')
      
      // 尝试优雅关闭
      this.serverProcess.kill('SIGTERM')
      
      // 等待进程结束
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // 强制关闭
          this.serverProcess?.kill('SIGKILL')
          resolve()
        }, 5000)
        
        this.serverProcess?.on('close', () => {
          clearTimeout(timeout)
          resolve()
        })
      })
      
      this.serverProcess = null
      console.log('✅ Server stopped')
    }
    
    // 确保端口被释放
    await this.killProcessOnPort(this.currentPort)
  }
  
  /**
   * 重启服务器（切换到新端口）
   */
  async restartOnNewPort(): Promise<number> {
    await this.stopServer()
    
    // 等待端口完全释放
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 使用新端口
    const newPort = this.currentPort + 1
    await this.startServer(newPort)
    
    return newPort
  }
  
  /**
   * 杀死指定端口上的进程
   */
  private async killProcessOnPort(port: number): Promise<void> {
    try {
      // macOS/Linux
      await execAsync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`)
    } catch (error) {
      // 忽略错误，可能没有进程在该端口
    }
  }
  
  /**
   * 检查端口是否可用
   */
  async isPortAvailable(port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`lsof -ti:${port}`)
      return stdout.trim() === ''
    } catch (error) {
      return true // lsof 报错通常意味着端口可用
    }
  }
  
  /**
   * 等待服务器就绪
   */
  async waitForServerReady(url: string, maxAttempts: number = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          return true
        }
      } catch (error) {
        // 继续等待
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    return false
  }
}

// 导出单例实例
export const serverControl = new ServerControl()

/**
 * 后端重启测试辅助函数
 * 用于在测试中模拟后端重启场景
 */
export async function withServerRestart<T>(
  page: any, // Playwright Page
  testFn: () => Promise<T>
): Promise<T> {
  const control = new ServerControl()
  
  // 执行测试前的操作
  const result = await testFn()
  
  // 重启服务器
  const newPort = await control.restartOnNewPort()
  
  // 导航到新端口
  await page.goto(`http://localhost:${newPort}`)
  
  // 等待应用就绪
  await page.waitForSelector('text=Prompt管家', { timeout: 30000 })
  
  return result
}

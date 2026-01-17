const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 递归复制目录
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  
  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function buildMacLauncher() {
  log('🚀 开始构建 Mac 一键启动器...', 'blue');
  
  const rootDir = process.cwd();
  const distDir = path.join(rootDir, 'dist');
  const launcherDir = path.join(distDir, 'prompt-optimizer-mac');
  
  try {
    // 1. 清理旧的构建
    log('\n📦 清理旧构建...', 'yellow');
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true });
    }
    fs.mkdirSync(distDir, { recursive: true });
    fs.mkdirSync(launcherDir, { recursive: true });
    
    // 2. 构建 Next.js standalone
    log('\n🔨 构建 Next.js 应用 (standalone 模式)...', 'yellow');
    execSync('npm run build', { stdio: 'inherit' });
    
    // 3. 复制 standalone 文件
    log('\n📂 复制 standalone 文件...', 'yellow');
    const standaloneDir = path.join(rootDir, '.next', 'standalone');
    if (fs.existsSync(standaloneDir)) {
      copyDirectory(standaloneDir, launcherDir);
      log('  ✓ Standalone 文件复制完成', 'green');
    }
    
    // 4. 复制 public 目录
    log('\n📂 复制 public 目录...', 'yellow');
    const publicDir = path.join(rootDir, 'public');
    if (fs.existsSync(publicDir)) {
      copyDirectory(publicDir, path.join(launcherDir, 'public'));
      log('  ✓ Public 目录复制完成', 'green');
    }
    
    // 5. 复制 .next/static 目录（如果需要）
    log('\n📂 复制静态文件...', 'yellow');
    const staticDir = path.join(rootDir, '.next', 'static');
    if (fs.existsSync(staticDir)) {
      const targetStaticDir = path.join(launcherDir, '.next', 'static');
      fs.mkdirSync(targetStaticDir, { recursive: true });
      copyDirectory(staticDir, targetStaticDir);
      log('  ✓ 静态文件复制完成', 'green');
    }
    
    // 6. 创建 prompts 目录
    log('\n📂 创建 prompts 目录...', 'yellow');
    const promptsDir = path.join(launcherDir, 'prompts');
    if (!fs.existsSync(promptsDir)) {
      fs.mkdirSync(promptsDir, { recursive: true });
    }
    
    // 复制现有的 prompts（如果存在）
    const sourcePromptsDir = path.join(rootDir, 'prompts');
    if (fs.existsSync(sourcePromptsDir)) {
      copyDirectory(sourcePromptsDir, promptsDir);
      log('  ✓ Prompts 目录复制完成', 'green');
    }
    
    // 7. 复制启动脚本
    log('\n📂 复制启动脚本...', 'yellow');
    fs.copyFileSync(
      path.join(rootDir, 'start.command'),
      path.join(launcherDir, 'start.command')
    );
    
    // 设置执行权限
    fs.chmodSync(path.join(launcherDir, 'start.command'), '755');
    log('  ✓ 启动脚本复制完成', 'green');
    
    // 8. 创建 .env.local.example
    log('\n📝 创建配置文件模板...', 'yellow');
    const envExample = `# OpenAI API 配置（可选）
OPENAI_API_KEY=your_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
`;
    fs.writeFileSync(path.join(launcherDir, '.env.local.example'), envExample);
    log('  ✓ 配置文件模板创建完成', 'green');
    
    // 9. 创建 README
    log('\n📝 创建说明文档...', 'yellow');
    const readme = `# Prompt Optimizer - Mac 一键启动器

## 使用方法

### 快速开始
1. 双击 \`start.command\` 文件
2. 等待浏览器自动打开
3. 开始使用！

### 系统要求
- macOS 10.15 或更高版本
- Node.js 16.0 或更高版本

### 首次使用
如果您还没有安装 Node.js，请先访问 https://nodejs.org/ 下载安装。

### 配置（可选）
如需使用 AI 功能，请：
1. 复制 \`.env.local.example\` 为 \`.env.local\`
2. 填入您的 OpenAI API Key

### 故障排除
- 如果端口 3000 被占用，启动器会自动选择其他端口
- 如果启动失败，请确保已安装 Node.js
- 使用 Ctrl+C 停止服务器

### 数据存储
您的所有数据都存储在浏览器的本地存储中，不会上传到任何服务器。

## 支持
如遇问题，请查看项目主页或提交 Issue。
`;
    fs.writeFileSync(path.join(launcherDir, 'README.md'), readme);
    log('  ✓ README 创建完成', 'green');
    
    // 10. 创建压缩包
    log('\n📦 创建压缩包...', 'yellow');
    execSync(`cd ${distDir} && tar -czf prompt-optimizer-mac.tar.gz prompt-optimizer-mac`, {
      stdio: 'inherit'
    });
    
    const tarSize = fs.statSync(path.join(distDir, 'prompt-optimizer-mac.tar.gz')).size;
    const tarSizeMB = (tarSize / 1024 / 1024).toFixed(2);
    
    log('\n✨ 构建完成！', 'green');
    log(`📦 输出文件: dist/prompt-optimizer-mac.tar.gz (${tarSizeMB} MB)`, 'green');
    log(`📂 解压目录: dist/prompt-optimizer-mac/`, 'green');
    log('\n使用方法:', 'blue');
    log('1. 解压 prompt-optimizer-mac.tar.gz', 'blue');
    log('2. 双击 start.command', 'blue');
    log('3. 享受！', 'blue');
    
  } catch (error) {
    log(`\n❌ 构建失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 运行构建
buildMacLauncher();
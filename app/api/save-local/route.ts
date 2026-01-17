import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getPromptsDir } from '@/lib/utils/paths'

interface SaveLocalRequest {
  projectName: string
  folderName?: string  // 可选的文件夹名称
  versionNumber: number
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveLocalRequest = await request.json()
    const { projectName, folderName, versionNumber, content } = body
    
    if (!projectName || !versionNumber || content === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }
    
    // 清理项目名称，移除不安全字符
    const safeProjectName = projectName.replace(/[<>:"/\\|?*]/g, '_')
    
    // 获取 prompts 目录（测试环境使用 prompts-test）
    const promptsDir = getPromptsDir()
    
    // 所有项目文件都直接保存在 /prompts/{projectName}/ 下
    // 文件夹只是逻辑概念，不影响文件存储位置
    const projectDir = path.join(promptsDir, safeProjectName)
    
    // 确保目录存在
    if (!existsSync(promptsDir)) {
      await mkdir(promptsDir, { recursive: true })
    }
    if (!existsSync(projectDir)) {
      await mkdir(projectDir, { recursive: true })
    }
    
    // 保存文件
    const fileName = `${safeProjectName}_v${versionNumber}.md`
    const filePath = path.join(projectDir, fileName)
    
    console.log(`📝 Saving version ${versionNumber} to: ${filePath}`)
    
    await writeFile(filePath, content, 'utf-8')
    
    console.log(`✅ Successfully saved ${content.length} characters to ${fileName}`)
    
    // 构建返回路径（始终是扁平结构）
    const relativePath = `prompts/${safeProjectName}/${fileName}`
    
    return NextResponse.json({
      success: true,
      path: relativePath
    })
  } catch (error) {
    console.error('Save local error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '保存失败' 
      },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { getPromptsDir } from '@/lib/utils/paths'

interface DeleteLocalRequest {
  projectName: string
}

export async function POST(request: NextRequest) {
  try {
    const body: DeleteLocalRequest = await request.json()
    const { projectName } = body
    
    if (!projectName) {
      return NextResponse.json(
        { success: false, error: '缺少项目名称' },
        { status: 400 }
      )
    }
    
    // 清理项目名称
    const safeProjectName = projectName.replace(/[<>:"/\\|?*]/g, '_')
    const promptsDir = getPromptsDir()
    const projectDir = path.join(promptsDir, safeProjectName)
    
    try {
      // 检查目录是否存在
      await fs.access(projectDir)
      
      // 递归删除目录
      await fs.rm(projectDir, { recursive: true, force: true })
      
      return NextResponse.json({
        success: true,
        message: `项目 "${projectName}" 已从文件系统删除`
      })
    } catch (accessError) {
      // 目录不存在，也算成功
      return NextResponse.json({
        success: true,
        message: `项目文件夹不存在，无需删除`
      })
    }
  } catch (error) {
    console.error('Delete local error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '删除失败' 
      },
      { status: 500 }
    )
  }
}

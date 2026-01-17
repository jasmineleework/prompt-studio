import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { getPromptsDir } from '@/lib/utils/paths'

interface RenameLocalRequest {
  oldName: string
  newName: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RenameLocalRequest = await request.json()
    const { oldName, newName } = body
    
    if (!oldName || !newName) {
      return NextResponse.json(
        { success: false, error: '缺少旧名称或新名称' },
        { status: 400 }
      )
    }
    
    // 清理名称
    const safeOldName = oldName.replace(/[<>:"/\\|?*]/g, '_')
    const safeNewName = newName.replace(/[<>:"/\\|?*]/g, '_')
    const promptsDir = getPromptsDir()
    const oldDir = path.join(promptsDir, safeOldName)
    const newDir = path.join(promptsDir, safeNewName)
    
    try {
      // 检查旧目录是否存在
      await fs.access(oldDir)
      
      // 检查新目录是否已存在
      try {
        await fs.access(newDir)
        return NextResponse.json(
          { success: false, error: `目标文件夹 "${newName}" 已存在` },
          { status: 400 }
        )
      } catch {
        // 新目录不存在，可以继续
      }
      
      // 重命名目录
      await fs.rename(oldDir, newDir)
      
      // 重命名目录内的版本文件
      const files = await fs.readdir(newDir)
      for (const file of files) {
        if (file.endsWith('.md')) {
          // 匹配 oldName_v数字.md 格式
          const versionMatch = file.match(/^(.+)_v(\d+)\.md$/)
          if (versionMatch && versionMatch[1] === safeOldName) {
            const versionNum = versionMatch[2]
            const newFileName = `${safeNewName}_v${versionNum}.md`
            const oldFilePath = path.join(newDir, file)
            const newFilePath = path.join(newDir, newFileName)
            await fs.rename(oldFilePath, newFilePath)
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `项目 "${oldName}" 已重命名为 "${newName}"`
      })
    } catch (accessError) {
      return NextResponse.json(
        { success: false, error: `项目文件夹 "${oldName}" 不存在` },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Rename local error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '重命名失败' 
      },
      { status: 500 }
    )
  }
}

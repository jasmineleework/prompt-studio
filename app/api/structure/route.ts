import { NextResponse, NextRequest } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { ProjectStructure } from '@/types'
import { getStructureFilePath, getPromptsDir } from '@/lib/utils/paths'

const DEFAULT_STRUCTURE: ProjectStructure = {
  version: "1.0.0",
  folders: [],
  projectMappings: {},
  lastUpdated: new Date().toISOString()
}

export async function GET() {
  try {
    const structureFilePath = getStructureFilePath()
    try {
      const fileContent = await fs.readFile(structureFilePath, 'utf-8')
      const structure: ProjectStructure = JSON.parse(fileContent)
      return NextResponse.json({ 
        success: true, 
        structure 
      })
    } catch (fileError) {
      // 如果文件不存在，创建默认结构
      console.log('Structure file not found, creating default structure')
      await fs.writeFile(structureFilePath, JSON.stringify(DEFAULT_STRUCTURE, null, 2))
      return NextResponse.json({ 
        success: true, 
        structure: DEFAULT_STRUCTURE 
      })
    }
  } catch (error) {
    console.error('Failed to read structure:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to read project structure',
      structure: DEFAULT_STRUCTURE
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { structure } = body as { structure: ProjectStructure }
    
    if (!structure) {
      return NextResponse.json({ 
        success: false, 
        error: 'Structure is required' 
      }, { status: 400 })
    }
    
    // 更新时间戳
    const updatedStructure: ProjectStructure = {
      ...structure,
      lastUpdated: new Date().toISOString()
    }
    
    // 确保 prompts 目录存在
    const promptsDir = getPromptsDir()
    try {
      await fs.access(promptsDir)
    } catch {
      await fs.mkdir(promptsDir, { recursive: true })
    }
    
    // 写入文件
    const structureFilePath = getStructureFilePath()
    await fs.writeFile(
      structureFilePath, 
      JSON.stringify(updatedStructure, null, 2)
    )
    
    return NextResponse.json({ 
      success: true, 
      structure: updatedStructure 
    })
  } catch (error) {
    console.error('Failed to save structure:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save project structure' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation, data } = body as { 
      operation: 'addFolder' | 'removeFolder' | 'mapProject' | 'unmapProject' | 'updateVersionDescription'
      data: any 
    }
    
    // 读取当前结构
    const structureFilePath = getStructureFilePath()
    let structure: ProjectStructure
    try {
      const fileContent = await fs.readFile(structureFilePath, 'utf-8')
      structure = JSON.parse(fileContent)
    } catch {
      structure = DEFAULT_STRUCTURE
    }
    
    // 根据操作类型更新结构
    switch (operation) {
      case 'addFolder':
        const { id, name, parentId } = data
        structure.folders.push({ id, name, parentId })
        break
        
      case 'removeFolder':
        const { folderId } = data
        structure.folders = structure.folders.filter(f => f.id !== folderId)
        // 清理项目映射
        Object.keys(structure.projectMappings).forEach(projectName => {
          if (structure.projectMappings[projectName] === folderId) {
            structure.projectMappings[projectName] = null
          }
        })
        break
        
      case 'mapProject':
        const { projectName, targetFolderId } = data
        structure.projectMappings[projectName] = targetFolderId
        break
        
      case 'unmapProject':
        const { projectName: unmapProjectName } = data
        structure.projectMappings[unmapProjectName] = null
        break
        
      case 'updateVersionDescription':
        const { projectName: descProjectName, versionNumber, description } = data
        if (!structure.versionDescriptions) {
          structure.versionDescriptions = {}
        }
        if (!structure.versionDescriptions[descProjectName]) {
          structure.versionDescriptions[descProjectName] = {}
        }
        if (description) {
          structure.versionDescriptions[descProjectName][versionNumber] = description
        } else {
          delete structure.versionDescriptions[descProjectName][versionNumber]
        }
        break
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid operation' 
        }, { status: 400 })
    }
    
    // 更新时间戳并保存
    structure.lastUpdated = new Date().toISOString()
    await fs.writeFile(structureFilePath, JSON.stringify(structure, null, 2))
    
    return NextResponse.json({ 
      success: true, 
      structure 
    })
  } catch (error) {
    console.error('Failed to update structure:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update project structure' 
    }, { status: 500 })
  }
}
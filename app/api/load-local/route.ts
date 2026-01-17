import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { ProjectStructure } from '@/types'
import { getPromptsDir } from '@/lib/utils/paths'

interface LocalProject {
  name: string
  versions: {
    versionNumber: number
    content: string
    fileName: string
  }[]
}

// 递归扫描所有目录，查找项目文件
async function scanDirectory(dirPath: string, depth: number, projectsMap: Map<string, LocalProject>) {
  // 限制递归深度，最多扫描3层
  if (depth > 2) return
  
  const items = await fs.readdir(dirPath)
  
  for (const item of items) {
    // 跳过 structure.json 和其他非目录文件
    if (item === 'structure.json' || item.startsWith('.')) continue
    
    const itemPath = path.join(dirPath, item)
    const stats = await fs.stat(itemPath)
    
    if (stats.isDirectory()) {
      // 检查是否包含版本文件
      const files = await fs.readdir(itemPath)
      const hasVersionFiles = files.some(f => f.match(/_v\d+\.md$/))
      
      if (hasVersionFiles) {
        // 提取项目名（从文件名中获取）
        const versionFile = files.find(f => f.match(/_v\d+\.md$/))
        const projectName = versionFile?.replace(/_v\d+\.md$/, '') || item
        
        // 如果项目已存在，合并版本
        if (!projectsMap.has(projectName)) {
          projectsMap.set(projectName, { name: projectName, versions: [] })
        }
        
        // 收集所有版本文件
        for (const file of files) {
          const versionMatch = file.match(/_v(\d+)\.md$/)
          if (versionMatch) {
            const versionNumber = parseInt(versionMatch[1], 10)
            const filePath = path.join(itemPath, file)
            const content = await fs.readFile(filePath, 'utf-8')
            
            projectsMap.get(projectName)!.versions.push({
              versionNumber,
              content,
              fileName: file
            })
          }
        }
      } else {
        // 继续递归扫描子目录
        await scanDirectory(itemPath, depth + 1, projectsMap)
      }
    } else if (item.match(/\.md$/)) {
      // 直接的md文件，检查是否为版本文件
      const versionMatch = item.match(/^(.+)_v(\d+)\.md$/)
      if (versionMatch) {
        const [, projectName, versionStr] = versionMatch
        const versionNumber = parseInt(versionStr, 10)
        
        if (!projectsMap.has(projectName)) {
          projectsMap.set(projectName, { name: projectName, versions: [] })
        }
        
        const filePath = path.join(dirPath, item)
        const content = await fs.readFile(filePath, 'utf-8')
        
        projectsMap.get(projectName)!.versions.push({
          versionNumber,
          content,
          fileName: item
        })
      }
    }
  }
}

export async function GET() {
  try {
    const projectsDir = getPromptsDir()
    
    try {
      await fs.access(projectsDir)
    } catch {
      return NextResponse.json({ 
        success: true, 
        projects: [],
        structure: null,
        lastModified: null
      })
    }
    
    const projectsMap = new Map<string, LocalProject>()
    
    // 开始扫描
    await scanDirectory(projectsDir, 0, projectsMap)
    
    // 转换为数组并排序版本
    const projects = Array.from(projectsMap.values())
    projects.forEach(project => {
      project.versions.sort((a, b) => a.versionNumber - b.versionNumber)
    })
    
    // 读取项目结构配置
    let structure: ProjectStructure | null = null
    const structureFilePath = path.join(projectsDir, 'structure.json')
    try {
      const structureContent = await fs.readFile(structureFilePath, 'utf-8')
      structure = JSON.parse(structureContent)
    } catch (error) {
      console.log('No structure file found, will create default one')
    }
    
    // 获取 prompts 目录的最后修改时间
    let lastModified: string | null = null
    try {
      const stats = await fs.stat(projectsDir)
      lastModified = stats.mtime.toISOString()
    } catch (error) {
      console.log('Could not get directory modification time')
    }

    return NextResponse.json({ 
      success: true, 
      projects: projects,
      structure: structure,
      lastModified: lastModified
    })
  } catch (error) {
    console.error('Failed to load local projects:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to load local projects',
      projects: [],
      structure: null,
      lastModified: null
    }, { status: 500 })
  }
}

async function loadProjectVersions(projectPath: string, projectName: string): Promise<LocalProject> {
  const project: LocalProject = {
    name: projectName,
    versions: []
  }
  
  try {
    const files = await fs.readdir(projectPath)
    const mdFiles = files
      .filter(f => f.endsWith('.md'))
      .sort()
    
    for (const file of mdFiles) {
      const versionMatch = file.match(/_v(\d+)\.md$/)
      const versionNumber = versionMatch ? parseInt(versionMatch[1]) : 1
      
      const content = await fs.readFile(
        path.join(projectPath, file),
        'utf-8'
      )
      
      project.versions.push({
        versionNumber,
        content,
        fileName: file
      })
    }
    
    project.versions.sort((a, b) => a.versionNumber - b.versionNumber)
  } catch (error) {
    console.error(`Failed to load versions for ${projectName}:`, error)
  }
  
  return project
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Clock, Check } from 'lucide-react'
import { useVersionStore } from '@/lib/stores/versionStore'
import { useProjectStore } from '@/lib/stores/projectStore'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export function VersionSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { currentProject } = useProjectStore()
  const { versions, currentVersion, selectVersion } = useVersionStore()
  
  const projectVersions = versions.filter(v => v.projectId === currentProject?.id)
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  if (!currentProject || projectVersions.length === 0) {
    return (
      <div className="px-3 py-1.5 text-sm text-muted-foreground">
        无版本
      </div>
    )
  }
  
  return (
    <div className="relative" ref={dropdownRef} data-testid="version-selector">
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="version-selector-button"
        className={cn(
          "flex items-center gap-2.5 px-4 py-2 text-sm border border-border-subtle rounded-lg transition-all",
          "hover:bg-background-hover hover:border-border-hover hover:shadow-sm",
          isOpen && "bg-background-hover border-primary shadow-sm"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            v{currentVersion?.versionNumber || '1'}
          </span>
          <span className="text-xs text-foreground-muted px-2 py-0.5 rounded-md bg-background-elevated">
            {currentVersion && format(new Date(currentVersion.timestamp), 'HH:mm')}
          </span>
        </div>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-foreground-muted transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-80 max-h-96 overflow-y-auto bg-surface-raised border border-border rounded-xl shadow-xl z-50 animate-scale-in" data-testid="version-dropdown">
          <div className="p-2">
            <div className="text-xs font-semibold text-foreground-muted px-3 py-2 flex items-center gap-2" data-testid="version-history-label">
              <Clock className="h-3 w-3" />
              版本历史
            </div>
            <div className="space-y-1 mt-1">
              {projectVersions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => {
                    selectVersion(version.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-lg transition-all group",
                    "hover:bg-background-hover hover:shadow-sm",
                    currentVersion?.id === version.id && "bg-surface-raised border border-border-strong"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="text-sm font-semibold text-foreground">
                          v{version.versionNumber}
                        </span>
                        {currentVersion?.id === version.id && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/20 text-primary">
                            <Check className="h-3 w-3" />
                            <span className="text-xs font-medium">当前</span>
                          </div>
                        )}
                      </div>
                      {version.description && (
                        <p className="text-xs text-foreground-muted mt-1 line-clamp-2 leading-relaxed">
                          {version.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-foreground-subtle">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {format(new Date(version.timestamp), 'MMM dd, HH:mm')}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-background-elevated">
                          {version.metadata.words} 字
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
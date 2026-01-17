import { create } from 'zustand'

interface EditorState {
  content: string
  originalContent: string
  hasUnsavedChanges: boolean
  lastSavedAt: Date | null
  
  setContent: (content: string) => void
  loadContent: (content: string) => void
  markAsSaved: () => void
  discardChanges: () => void
  checkUnsavedChanges: () => boolean
}

export const useEditorStore = create<EditorState>((set, get) => ({
  content: '',
  originalContent: '',
  hasUnsavedChanges: false,
  lastSavedAt: null,
  
  setContent: (content: string) => {
    const { originalContent } = get()
    set({ 
      content,
      hasUnsavedChanges: content !== originalContent
    })
  },
  
  loadContent: (content: string) => {
    set({
      content,
      originalContent: content,
      hasUnsavedChanges: false
    })
  },
  
  markAsSaved: () => {
    const { content } = get()
    set({
      originalContent: content,
      hasUnsavedChanges: false,
      lastSavedAt: new Date()
    })
  },
  
  discardChanges: () => {
    const { originalContent } = get()
    set({
      content: originalContent,
      hasUnsavedChanges: false
    })
  },
  
  checkUnsavedChanges: () => {
    return get().hasUnsavedChanges
  }
}))
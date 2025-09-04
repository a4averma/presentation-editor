import { ref, computed } from 'vue'

// Type definitions
export interface CanvasConfig {
  width: number
  height: number
  backgroundColor: string
}

export interface ShapeStyle {
  fill: string
  stroke: string
  strokeWidth: number
}

export interface Shape {
  id: string
  type: 'rectangle' | 'circle' | 'line' | 'text'
  x: number
  y: number
  createdAt: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  width?: number
  height?: number
  radius?: number
  points?: number[]
  text?: string
  fontSize?: number
  fontFamily?: string
  fontStyle?: string
  textAlign?: string
  isBold?: boolean
  isItalic?: boolean
  isStrikethrough?: boolean
  isBullet?: boolean
  isMath?: boolean
  mathDisplayMode?: boolean
  mathImageData?: string
  htmlContent?: string
}

export interface CanvasState {
  canvas: CanvasConfig
  shapes: Shape[]
  selectedShapeIds: string[]
  tool: 'select' | 'rectangle' | 'circle' | 'line' | 'pencil' | 'text'
  style: ShapeStyle
  metadata: {
    name: string
    lastModified: string
    shapeCount: number
  }
}

interface HistoryItem {
  state: CanvasState
  timestamp: number
  description: string
}

export function useCanvasStore() {
  // Helper function to generate unique IDs
  function generateId(): string {
    return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Canvas state
  const state = ref<CanvasState>({
    canvas: {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff'
    },
    shapes: [],
    selectedShapeIds: [],
    tool: 'select',
    style: {
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 2
    },
    metadata: {
      name: 'Untitled Canvas',
      lastModified: new Date().toISOString(),
      shapeCount: 0
    }
  })

  // Undo/Redo stacks
  const undoStack = ref<HistoryItem[]>([])
  const redoStack = ref<HistoryItem[]>([])
  const maxHistorySize = ref(50)

  // Computed properties
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const historySize = computed(() => undoStack.value.length)
  const selectedShapes = computed(() =>
    state.value.shapes.filter(shape =>
      state.value.selectedShapeIds.includes(shape.id)
    )
  )

  // Helper function to deep clone state
  function cloneState(state: CanvasState): CanvasState {
    return JSON.parse(JSON.stringify(state))
  }

  // Save state to history
  function saveToHistory(description: string) {
    undoStack.value.push({
      state: cloneState(state.value),
      timestamp: Date.now(),
      description
    })

    if (undoStack.value.length > maxHistorySize.value) {
      undoStack.value.shift()
    }

    redoStack.value = []
  }

  // Update state
  function updateState(updates: Partial<CanvasState>, skipHistory = false, description = 'Canvas update') {
    if (!skipHistory) {
      saveToHistory(description)
    }

    // Apply updates
    if (updates.shapes !== undefined) state.value.shapes = updates.shapes
    if (updates.selectedShapeIds !== undefined) state.value.selectedShapeIds = updates.selectedShapeIds
    if (updates.canvas) Object.assign(state.value.canvas, updates.canvas)
    if (updates.style) Object.assign(state.value.style, updates.style)
    if (updates.tool) state.value.tool = updates.tool

    // Update metadata
    state.value.metadata.shapeCount = state.value.shapes.length
    state.value.metadata.lastModified = new Date().toISOString()
  }

  // Shape operations
  function addShape(shapeData: Omit<Shape, 'id' | 'createdAt'>): string {
    const shape: Shape = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...shapeData
    }

    const newShapes = [...state.value.shapes, shape]
    updateState({ shapes: newShapes }, false, `Add ${shape.type}`)
    return shape.id
  }

  function updateShape(shapeId: string, updates: Partial<Shape>): void {
    const newShapes = state.value.shapes.map(shape =>
      shape.id === shapeId ? { ...shape, ...updates } : shape
    )
    updateState({ shapes: newShapes }, false, 'Update shape')
  }

  function deleteShapes(shapeIds?: string[]): void {
    const idsToDelete = shapeIds || state.value.selectedShapeIds
    if (idsToDelete.length === 0) return

    const newShapes = state.value.shapes.filter(shape =>
      !idsToDelete.includes(shape.id)
    )
    const newSelectedIds = state.value.selectedShapeIds.filter(id =>
      !idsToDelete.includes(id)
    )

    updateState({
      shapes: newShapes,
      selectedShapeIds: newSelectedIds
    }, false, `Delete ${idsToDelete.length} shape(s)`)
  }

  function moveShapes(shapeIds: string[], deltaX: number, deltaY: number): void {
    const newShapes = state.value.shapes.map(shape => {
      if (shapeIds.includes(shape.id)) {
        return {
          ...shape,
          x: shape.x + deltaX,
          y: shape.y + deltaY
        }
      }
      return shape
    })
    updateState({ shapes: newShapes }, false, 'Move shapes')
  }

  function duplicateShapes(shapeIds?: string[]): void {
    const idsToDuplicate = shapeIds || state.value.selectedShapeIds
    if (idsToDuplicate.length === 0) return

    const newShapes = [...state.value.shapes]
    const newSelectedIds: string[] = []

    idsToDuplicate.forEach(id => {
      const originalShape = state.value.shapes.find(s => s.id === id)
      if (originalShape) {
        const duplicatedShape: Shape = {
          ...originalShape,
          id: generateId(),
          x: originalShape.x + 20,
          y: originalShape.y + 20,
          createdAt: new Date().toISOString()
        }
        newShapes.push(duplicatedShape)
        newSelectedIds.push(duplicatedShape.id)
      }
    })

    updateState({
      shapes: newShapes,
      selectedShapeIds: newSelectedIds
    }, false, 'Duplicate shapes')
  }

  // Selection operations
  function selectShapes(shapeIds: string[], addToSelection = false): void {
    const newSelectedIds = addToSelection
      ? [...new Set([...state.value.selectedShapeIds, ...shapeIds])]
      : shapeIds

    updateState({ selectedShapeIds: newSelectedIds }, true)
  }

  function clearSelection(): void {
    updateState({ selectedShapeIds: [] }, true)
  }

  // Tool and style operations
  function setTool(tool: CanvasState['tool']): void {
    updateState({ tool }, true)
  }

  function updateStyle(styleUpdates: Partial<ShapeStyle>): void {
    updateState({ style: { ...state.value.style, ...styleUpdates } }, true)
  }

  // Canvas operations
  function updateCanvas(canvasUpdates: Partial<CanvasConfig>): void {
    updateState({ canvas: { ...state.value.canvas, ...canvasUpdates } }, false, 'Update canvas')
  }

  function clearCanvas(): void {
    updateState({
      shapes: [],
      selectedShapeIds: []
    }, false, 'Clear canvas')
  }

  // Undo/Redo functions
  function undo(): boolean {
    if (!canUndo.value) return false

    const historyItem = undoStack.value.pop()!

    redoStack.value.push({
      state: cloneState(state.value),
      timestamp: Date.now(),
      description: 'Redo item'
    })

    state.value = cloneState(historyItem.state)
    return true
  }

  function redo(): boolean {
    if (!canRedo.value) return false

    const redoItem = redoStack.value.pop()!

    undoStack.value.push({
      state: cloneState(state.value),
      timestamp: Date.now(),
      description: 'Undo item'
    })

    state.value = cloneState(redoItem.state)
    return true
  }

  function clearHistory(): void {
    undoStack.value = []
    redoStack.value = []
  }

  // Getters
  const currentState = computed(() => state.value)
  const shapes = computed(() => state.value.shapes)
  const canvas = computed(() => state.value.canvas)
  const tool = computed(() => state.value.tool)
  const style = computed(() => state.value.style)
  const metadata = computed(() => state.value.metadata)

  return {
    // State
    currentState,
    shapes,
    canvas,
    tool,
    style,
    metadata,
    selectedShapes,

    // History
    canUndo,
    canRedo,
    historySize,

    // Shape operations
    addShape,
    updateShape,
    deleteShapes,
    moveShapes,
    duplicateShapes,

    // Selection
    selectShapes,
    clearSelection,

    // Tools and styles
    setTool,
    updateStyle,

    // Canvas
    updateCanvas,
    clearCanvas,

    // History operations
    undo,
    redo,
    clearHistory,

    // Configuration
    maxHistorySize
  }
} 
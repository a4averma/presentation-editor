<template>
  <div class="canvas-editor">
    <!-- Slides Panel -->
    <div class="slides-panel">
      <h3 style="color: #222;">Slides</h3>
      <div class="slides-header">
        <div class="header-actions">
          <button @click="showSettingsModal = true" class="btn settings-btn" title="API Settings">
            <Settings :size="16" />
          </button>
          <button @click="showAIModal = true" class="btn ai-btn" title="Generate with AI">
            <Sparkles :size="16" />
            <span>AI Generate</span>
          </button>
          <button @click="addNewSlide" class="btn add-slide-btn" title="Add New Slide">
            <Plus :size="16" />
          </button>
        </div>
      </div>
      
      <div class="slides-list">
        <div 
          v-for="(slide, index) in slidesStore.slides.value" 
          :key="slide.id"
          @click="selectSlide(index)"
          :class="{ 
            'slide-item': true, 
            'active': index === slidesStore.currentSlideIndex.value 
          }"
        >
          <div class="slide-preview">
            <div class="slide-number">{{ index + 1 }}</div>
            <div class="slide-thumbnail">
              <div class="thumbnail-canvas">
                <div class="mini-shapes">
                  <div 
                    v-for="shape in slide.shapes.slice(0, 3)" 
                    :key="shape.id"
                    :class="`mini-shape mini-${shape.type}`"
                    :style="getMiniShapeStyle(shape)"
                  ></div>
                  <div v-if="slide.shapes.length > 3" class="more-shapes">
                    +{{ slide.shapes.length - 3 }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="slide-info">
            <input 
              v-model="slide.name"
              @blur="updateSlideName(index, slide.name)"
              @keyup.enter="(e) => (e.target as HTMLInputElement)?.blur()"
              class="slide-name-input"
            />
            <div class="slide-actions">
              <button 
                @click.stop="showEnhanceModal = true; enhanceSlideIndex = index" 
                class="slide-action-btn ai-enhance"
                title="Enhance with AI"
              >
                <Sparkles :size="12" />
              </button>
              <button 
                @click.stop="duplicateSlide(index)" 
                class="slide-action-btn"
                title="Duplicate Slide"
              >
                <Copy :size="14" />
              </button>
              <button 
                @click.stop="deleteSlide(index)" 
                class="slide-action-btn delete"
                title="Delete Slide"
                :disabled="slidesStore.slideCount.value <= 1"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="toolbar">
        <!-- Top Row: Main Tools and Actions -->
        <div class="toolbar-row toolbar-primary">
          <!-- Left: History Controls -->
          <div class="toolbar-group">
            <button 
              @click="store.undo()" 
              :disabled="!store.canUndo.value"
              class="btn btn-icon"
              title="Undo"
            >
              <Undo2 :size="18" />
            </button>
            <button 
              @click="store.redo()" 
              :disabled="!store.canRedo.value"
              class="btn btn-icon"
              title="Redo"
            >
              <Redo2 :size="18" />
            </button>
          </div>

          <!-- Center: Drawing Tools -->
          <div class="toolbar-group tools-group">
            <button 
              v-for="tool in tools" 
              :key="tool"
              @click="store.setTool(tool)"
              :class="{ active: store.tool.value === tool }"
              class="btn tool-btn"
              :title="tool.charAt(0).toUpperCase() + tool.slice(1)"
            >
              <MousePointer v-if="tool === 'select'" :size="20" />
              <Square v-else-if="tool === 'rectangle'" :size="20" />
              <Circle v-else-if="tool === 'circle'" :size="20" />
              <Minus v-else-if="tool === 'line'" :size="20" />
              <Pencil v-else-if="tool === 'pencil'" :size="20" />
              <Type v-else-if="tool === 'text'" :size="20" />
              <span class="tool-label">{{ tool.charAt(0).toUpperCase() + tool.slice(1) }}</span>
            </button>
          </div>

          <!-- Right: Action Buttons -->
          <div class="toolbar-group actions-group">
            <button 
              @click="duplicateSelected" 
              :disabled="store.selectedShapes.value.length === 0"
              class="btn btn-secondary"
              title="Duplicate Selected"
            >
              <Copy :size="16" />
              <span>Duplicate</span>
            </button>
            <button 
              @click="deleteSelected" 
              :disabled="store.selectedShapes.value.length === 0"
              class="btn btn-danger"
              title="Delete Selected"
            >
              <Trash2 :size="16" />
              <span>Delete</span>
            </button>
            <button @click="store.clearCanvas()" class="btn btn-danger-outline" title="Clear Canvas">
              <Trash2 :size="16" />
              <span>Clear Canvas</span>
            </button>
          </div>
        </div>

        <!-- Bottom Row: Properties and Style Controls -->
        <div class="toolbar-row toolbar-secondary">
          <!-- Style Controls -->
          <div class="toolbar-group style-controls-group">
            <div class="control-section">
              <label class="control-label">Fill</label>
              <input 
                type="color" 
                :value="store.style.value.fill"
                @input="updateFill"
                class="color-input"
              />
            </div>
            
            <div class="control-section">
              <label class="control-label">Stroke</label>
              <input 
                type="color" 
                :value="store.style.value.stroke"
                @input="updateStroke"
                class="color-input"
              />
            </div>
            
            <div class="control-section">
              <label class="control-label">Width</label>
              <div class="range-control">
                <input 
                  type="range" 
                  min="1" 
                  max="20"
                  :value="store.style.value.strokeWidth"
                  @input="updateStrokeWidth"
                  class="range-input"
                />
                <span class="range-value">{{ store.style.value.strokeWidth }}px</span>
              </div>
            </div>
          </div>

          <!-- Text Controls (when applicable) -->
          <div class="toolbar-group text-controls-group" v-if="store.tool.value === 'text' || hasSelectedText">
            <div class="control-section">
              <label class="control-label">Size</label>
              <input 
                type="number" 
                min="8" 
                max="72"
                :value="selectedTextFontSize"
                @input="updateFontSize"
                class="number-input"
              />
            </div>
            
            <div class="control-section">
              <label class="control-label">Font</label>
              <select @change="updateFontFamily" :value="selectedTextFontFamily" class="select-input">
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>
            </div>
          </div>

          <!-- Utility Actions -->
          <div class="toolbar-group utility-group">
            <button @click="store.clearHistory()" class="btn btn-ghost" title="Clear History">
              <RotateCcw :size="16" />
              <span>Clear History</span>
            </button>
          </div>
        </div>
      </div>

      <div class="canvas-container">
        <div ref="canvasContainer" class="konva-container"></div>
      </div>

      <div class="status">
        <p>Tool: {{ store.tool.value }}</p>
        <p>Slides: {{ slidesStore.slideCount.value }}</p>
        <p>Shapes: {{ slidesStore.currentSlide.value?.shapes.length || 0 }}</p>
        <p>Selected: {{ store.selectedShapes.value.length }}</p>
      </div>
    </div>

    <!-- Rich Text Editor Modal -->
    <div v-if="showRichTextEditor" class="modal-overlay" @click="closeRichTextEditor">
      <div class="rich-text-modal" @click.stop>
        <div class="modal-header">
          <h3>Edit Text</h3>
          <button @click="closeRichTextEditor" class="close-btn">
            <X :size="20" />
          </button>
        </div>
        
        <div class="formatting-toolbar">
          <button 
            @click="toggleFormat('bold')" 
            :class="{ active: currentFormat.isBold }"
            class="format-btn"
            title="Bold"
          >
            <Bold :size="16" />
          </button>
          <button 
            @click="toggleFormat('italic')" 
            :class="{ active: currentFormat.isItalic }"
            class="format-btn"
            title="Italic"
          >
            <Italic :size="16" />
          </button>
          <button 
            @click="toggleFormat('strikethrough')" 
            :class="{ active: currentFormat.isStrikethrough }"
            class="format-btn"
            title="Strikethrough"
          >
            <Strikethrough :size="16" />
          </button>
          <button 
            @click="toggleFormat('bullet')" 
            :class="{ active: currentFormat.isBullet }"
            class="format-btn"
            title="Bullet Point"
          >
            <List :size="16" />
          </button>
          <button 
            @click="toggleFormat('math')" 
            :class="{ active: currentFormat.isMath }"
            class="format-btn"
            title="Math Mode (LaTeX)"
          >
            <Calculator :size="16" />
          </button>
          
          <!-- Math Mode Options -->
          <div v-if="currentFormat.isMath" class="math-mode-toggle">
            <button 
              @click="currentFormat.mathDisplayMode = true"
              :class="{ active: currentFormat.mathDisplayMode }"
              class="format-btn mini-btn"
              title="Display Math (Block)"
            >
              𝒇(𝒙)
            </button>
            <button 
              @click="currentFormat.mathDisplayMode = false"
              :class="{ active: !currentFormat.mathDisplayMode }"
              class="format-btn mini-btn"
              title="Inline Math"
            >
              f(x)
            </button>
          </div>
        </div>

        <div class="text-editor">
          <textarea 
            ref="textAreaRef"
            v-model="editingText"
            :placeholder="currentFormat.isMath ? (currentFormat.mathDisplayMode ? 'Enter LaTeX math expression... e.g., x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}' : 'Enter inline LaTeX... e.g., \\alpha + \\beta = \\gamma') : 'Enter your text...'"
            rows="6"
            @input="updatePreview"
          ></textarea>
          <div v-if="currentFormat.isMath" class="math-help">
            <details>
              <summary>LaTeX Math Examples</summary>
              <div class="math-examples">
                <div class="example">
                  <code>x^2 + y^2 = r^2</code> → x² + y² = r²
                </div>
                <div class="example">
                  <code>\frac{a}{b}</code> → Fraction a/b
                </div>
                <div class="example">
                  <code>\sqrt{x}</code> → Square root of x
                </div>
                <div class="example">
                  <code>\sum_{i=1}^{n} x_i</code> → Summation
                </div>
                <div class="example">
                  <code>\int_{a}^{b} f(x)dx</code> → Integral
                </div>
                <div class="example">
                  <code>\alpha, \beta, \gamma</code> → Greek letters
                </div>
              </div>
            </details>
          </div>
        </div>

        <div class="text-preview">
          <h4>Preview:</h4>
          <div 
            class="preview-content"
            :style="previewStyle"
            v-html="formattedPreview"
          ></div>
        </div>

        <div class="modal-actions">
          <button @click="closeRichTextEditor" class="btn cancel-btn">Cancel</button>
          <button @click="applyTextChanges" class="btn apply-btn">Apply</button>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettingsModal" class="modal-overlay" @click="closeSettingsModal">
      <div class="modal settings-modal" @click.stop>
        <div class="modal-header">
          <h3>API Settings</h3>
          <button @click="closeSettingsModal" class="close-btn">
            <X :size="20" />
          </button>
        </div>
        
        <div class="modal-content">
          <div class="settings-form">
            <div class="api-provider-section">
              <h4>OpenRouter Configuration</h4>
              <p class="provider-description">
                Get your free API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">OpenRouter</a> 
                to enable AI slide generation with various models.
              </p>
              
              <div class="form-group">
                <label class="form-label">API Key</label>
                <div class="api-key-input-group">
                  <input 
                    :type="showApiKey ? 'text' : 'password'"
                    v-model="tempApiKey"
                    placeholder="sk-or-v1-..."
                    class="api-key-input"
                  />
                  <button 
                    @click="showApiKey = !showApiKey" 
                    class="toggle-visibility-btn"
                    type="button"
                  >
                    <Eye v-if="!showApiKey" :size="16" />
                    <EyeOff v-else :size="16" />
                  </button>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Model</label>
                <select v-model="tempModel" class="select-input">
                  <option value="deepseek/deepseek-chat:free">DeepSeek Chat (Free)</option>
                  <option value="google/gemini-flash-1.5">Gemini Flash 1.5</option>
                  <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                  <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>
              
              <div class="api-status">
                <div :class="['status-indicator', slidesStore.aiService.isConfigured() ? 'connected' : 'disconnected']">
                  <div class="status-dot"></div>
                  <span>{{ slidesStore.aiService.isConfigured() ? 'API Configured' : 'API Not Configured' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="closeSettingsModal" class="btn cancel-btn">Cancel</button>
          <button @click="saveSettings" class="btn save-btn">Save Settings</button>
        </div>
      </div>
    </div>

    <!-- AI Generation Modal -->
    <div v-if="showAIModal" class="modal-overlay" @click="closeAIModal">
      <div class="modal ai-modal" @click.stop>
        <div class="modal-header">
          <h3>Generate Slides with AI</h3>
          <button @click="closeAIModal" class="close-btn">
            <X :size="20" />
          </button>
        </div>
        
        <!-- API Configuration Warning -->
        <div v-if="!slidesStore.aiService.isConfigured()" class="api-warning">
          <div class="warning-content">
            <AlertTriangle :size="20" />
            <div>
              <strong>API Key Required</strong>
              <p>Configure your OpenRouter API key in settings to use AI generation.</p>
            </div>
            <button @click="showSettingsModal = true; showAIModal = false" class="btn setup-btn">
              Setup API
            </button>
          </div>
        </div>
        
        <div class="modal-content ai-content">
          <div class="ai-form">
            <div class="form-group">
              <label class="form-label">Topic or Presentation Subject</label>
              <textarea 
                v-model="aiRequest.topic"
                placeholder="Enter your presentation topic, e.g., 'Machine Learning Fundamentals, Data Science, AI Ethics'"
                class="topic-textarea"
                rows="3"
                :disabled="!slidesStore.aiService.isConfigured()"
              ></textarea>
              <small class="form-hint">Separate multiple topics with commas for varied content</small>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Number of Slides</label>
                <input 
                  type="number" 
                  v-model.number="aiRequest.slideCount"
                  min="1" 
                  max="20"
                  class="number-input"
                  :disabled="!slidesStore.aiService.isConfigured()"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Presentation Style</label>
                <select v-model="aiRequest.style" class="select-input" :disabled="!slidesStore.aiService.isConfigured()">
                  <option value="professional">Professional</option>
                  <option value="creative">Creative</option>
                  <option value="minimal">Minimal</option>
                  <option value="academic">Academic</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Slide Generation Mode</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input 
                    type="radio" 
                    v-model="aiRequest.generationMode"
                    value="replace"
                    class="radio-input"
                    :disabled="!slidesStore.aiService.isConfigured()"
                  />
                  <span class="radio-text">
                    <strong>Replace All Slides</strong>
                    <small>Clear existing slides and create new presentation</small>
                  </span>
                </label>
                
                <label class="radio-label">
                  <input 
                    type="radio" 
                    v-model="aiRequest.generationMode"
                    value="append"
                    class="radio-input"
                    :disabled="!slidesStore.aiService.isConfigured()"
                  />
                  <span class="radio-text">
                    <strong>Add to End</strong>
                    <small>Append new slides after existing ones</small>
                  </span>
                </label>
                
                <label class="radio-label">
                  <input 
                    type="radio" 
                    v-model="aiRequest.generationMode"
                    value="insert"
                    class="radio-input"
                    :disabled="!slidesStore.aiService.isConfigured()"
                  />
                  <span class="radio-text">
                    <strong>Insert After Current</strong>
                    <small>Insert new slides after the currently selected slide</small>
                  </span>
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Language</label>
              <select v-model="aiRequest.language" class="select-input" :disabled="!slidesStore.aiService.isConfigured()">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
            
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="aiRequest.includeImages"
                  class="checkbox-input"
                  :disabled="!slidesStore.aiService.isConfigured()"
                />
                <span class="checkbox-text">Include visual elements and shapes</span>
              </label>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="closeAIModal" class="btn cancel-btn">Cancel</button>
          <button 
            @click="generateSlides" 
            :disabled="!aiRequest.topic || slidesStore.aiService.isGenerating.value || !slidesStore.aiService.isConfigured()"
            class="btn generate-btn"
          >
            <Sparkles v-if="!slidesStore.aiService.isGenerating.value" :size="16" />
            <span v-if="slidesStore.aiService.isGenerating.value">Generating...</span>
            <span v-else>Generate Slides</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Slide Enhancement Modal -->
    <div v-if="showEnhanceModal" class="modal-overlay" @click="closeEnhanceModal">
      <div class="modal enhance-modal" @click.stop>
        <div class="modal-header">
          <h3>Enhance Slide with AI</h3>
          <button @click="closeEnhanceModal" class="close-btn">
            <X :size="20" />
          </button>
        </div>
        
        <div class="modal-content">
          <div class="form-group">
            <label class="form-label">Enhancement Instructions</label>
            <textarea 
              v-model="enhancePrompt"
              placeholder="Describe how you want to enhance this slide, e.g., 'Add more details about benefits', 'Include statistics and data', 'Make it more visual'"
              class="topic-textarea"
              rows="4"
            ></textarea>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="closeEnhanceModal" class="btn cancel-btn">Cancel</button>
          <button 
            @click="enhanceSlide" 
            :disabled="!enhancePrompt || slidesStore.aiService.isGenerating.value"
            class="btn enhance-btn"
          >
            <Sparkles v-if="!slidesStore.aiService.isGenerating.value" :size="16" />
            <span v-if="slidesStore.aiService.isGenerating.value">Enhancing...</span>
            <span v-else>Enhance Slide</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import Konva from 'konva'
import katex from 'katex'
import { useCanvasStore, type Shape } from '../composables/useCanvasStore'
import { useSlidesStore } from '../composables/useSlidesStore'
import { 
  Undo2, 
  Redo2, 
  RotateCcw, 
  MousePointer, 
  Square, 
  Circle, 
  Minus, 
  Pencil, 
  Type, 
  Trash2, 
  Copy, 
  Plus,
  X,
  Bold,
  Italic,
  Strikethrough,
  List,
  Sparkles,
  Settings,
  Eye,
  EyeOff,
  AlertTriangle,
  Calculator
} from 'lucide-vue-next'

const store = useCanvasStore()
const slidesStore = useSlidesStore()
const canvasContainer = ref<HTMLDivElement | null>(null)
const tools = ['select', 'rectangle', 'circle', 'line', 'pencil', 'text'] as const

let stage: Konva.Stage | null = null
let layer: Konva.Layer | null = null
let isDrawing = false
let currentShape: Partial<Shape> | null = null

// Rich text editor state
const showRichTextEditor = ref(false)
const editingText = ref('')
const editingShapeId = ref<string | null>(null)
const textAreaRef = ref<HTMLTextAreaElement | null>(null)

const currentFormat = ref({
  isBold: false,
  isItalic: false,
  isStrikethrough: false,
  isBullet: false,
  isMath: false,
  mathDisplayMode: true
})

// AI generation state
const showAIModal = ref(false)
const aiRequest = ref({
  topic: '',
  slideCount: 1,
  style: 'professional' as 'professional' | 'creative' | 'minimal' | 'academic',
  language: 'en',
  includeImages: true,
  generationMode: 'replace' as 'replace' | 'append' | 'insert'
})

// Slide enhancement state
const showEnhanceModal = ref(false)
const enhancePrompt = ref('')
const enhanceSlideIndex = ref<number | null>(null)

// Settings modal state
const showSettingsModal = ref(false)
const showApiKey = ref(false)
const tempApiKey = ref('')
const tempModel = ref('deepseek/deepseek-chat:free')

onMounted(() => {
  initKonva()
  setupKeyboardShortcuts()
})

onUnmounted(() => {
  cleanup()
})

function initKonva() {
  if (!canvasContainer.value) return

  stage = new Konva.Stage({
    container: canvasContainer.value,
    width: store.canvas.value.width,
    height: store.canvas.value.height
  })

  layer = new Konva.Layer()
  stage.add(layer)

  // Event listeners
  stage.on('mousedown touchstart', handleMouseDown)
  stage.on('mousemove touchmove', handleMouseMove) 
  stage.on('mouseup touchend', handleMouseUp)
  stage.on('click tap', handleClick)

  // Watch for shape changes and redraw
  watchShapeChanges()
}

function watchShapeChanges() {
  watch(() => store.shapes.value, async (newShapes) => {
    await redrawCanvas(newShapes)
  }, { deep: true })

  watch(() => store.selectedShapes.value, (selectedShapes) => {
    updateSelection(selectedShapes)
  })
}

async function redrawCanvas(shapes: Shape[]) {
  if (!layer) return
  
  layer.destroyChildren()
  
  // Process shapes sequentially to handle async math rendering
  for (const shapeData of shapes) {
    // Skip invalid shapes
    if (!shapeData || !shapeData.id || !shapeData.type) {
      console.warn('Skipping invalid shape:', shapeData)
      continue
    }
    
    // Ensure coordinates are valid numbers
    if (typeof shapeData.x !== 'number' || typeof shapeData.y !== 'number') {
      console.warn('Skipping shape with invalid coordinates:', shapeData)
      continue
    }
    
    // Handle math text specially
    if (shapeData.type === 'text' && shapeData.isMath && shapeData.mathImageData) {
      try {
        const mathImage = await createKonvaImageFromData(shapeData.mathImageData, shapeData)
        if (mathImage) {
          // Add selection handling
          if (store.selectedShapes.value.some(s => s.id === shapeData.id)) {
            mathImage.setAttrs({
              strokeEnabled: true,
              stroke: '#0066cc',
              strokeWidth: 3
            })
          }
          
          layer?.add(mathImage)
          continue
        }
      } catch (error) {
        console.warn('Failed to render math image:', error)
        // Fall through to render as regular text
      }
    }
    
    let shape: Konva.Shape | null = null
    
    switch (shapeData.type) {
      case 'rectangle':
        const width = shapeData.width || 100
        const height = shapeData.height || 100
        
        // Skip rectangles with invalid dimensions
        if (width <= 0 || height <= 0) {
          console.warn('Skipping rectangle with invalid dimensions:', shapeData)
          return
        }
        
        shape = new Konva.Rect({
          id: shapeData.id,
          x: shapeData.x,
          y: shapeData.y,
          width: width,
          height: height,
          fill: shapeData.fill || store.style.value.fill,
          stroke: shapeData.stroke || store.style.value.stroke,
          strokeWidth: shapeData.strokeWidth || store.style.value.strokeWidth
        })
        break
      
      case 'circle':
        const radius = shapeData.radius || 50
        
        // Skip circles with invalid radius
        if (radius <= 0) {
          console.warn('Skipping circle with invalid radius:', shapeData)
          return
        }
        
        shape = new Konva.Circle({
          id: shapeData.id,
          x: shapeData.x,
          y: shapeData.y,
          radius: radius,
          fill: shapeData.fill || store.style.value.fill,
          stroke: shapeData.stroke || store.style.value.stroke,
          strokeWidth: shapeData.strokeWidth || store.style.value.strokeWidth
        })
        break
      
      case 'line':
        const points = shapeData.points || [shapeData.x, shapeData.y, shapeData.x + 100, shapeData.y + 100]
        
        // Skip lines with invalid points
        if (!Array.isArray(points) || points.length < 4 || points.some(p => typeof p !== 'number')) {
          console.warn('Skipping line with invalid points:', shapeData)
          return
        }
        
        shape = new Konva.Line({
          id: shapeData.id,
          points: points,
          stroke: shapeData.stroke || store.style.value.stroke,
          strokeWidth: shapeData.strokeWidth || store.style.value.strokeWidth,
          lineCap: 'round',
          lineJoin: 'round'
        })
        break
      
      case 'text':
        let displayText = shapeData.text || 'Double click to edit'
        let fontStyle = 'normal'
        
        // Handle math mode fallback (when mathImageData is not available)
        if (shapeData.isMath) {
          try {
            // For math mode without cached image, show a simplified representation
            const mathPreview = shapeData.text || ''
            displayText = `📐 ${mathPreview.length > 20 ? mathPreview.substring(0, 17) + '...' : mathPreview}`
            fontStyle = 'italic'
          } catch (error) {
            displayText = '📐 [Invalid Math]'
            fontStyle = 'italic'
          }
        } else {
          // Handle bullet points
          if (shapeData.isBullet) {
            displayText = displayText.split('\n').map(line => 
              line.trim() ? `• ${line.trim()}` : ''
            ).join('\n')
          }
          
          // Handle bold and italic
          if (shapeData.isBold && shapeData.isItalic) {
            fontStyle = 'bold italic'
          } else if (shapeData.isBold) {
            fontStyle = 'bold'
          } else if (shapeData.isItalic) {
            fontStyle = 'italic'
          }
        }
        
        shape = new Konva.Text({
          id: shapeData.id,
          x: shapeData.x,
          y: shapeData.y,
          text: displayText,
          fontSize: shapeData.fontSize || 24,
          fontFamily: shapeData.fontFamily || (shapeData.isMath ? 'KaTeX_Main' : 'Arial'),
          fontStyle: fontStyle,
          fill: shapeData.fill || store.style.value.fill,
          stroke: shapeData.stroke || store.style.value.stroke,
          strokeWidth: shapeData.strokeWidth || 0,
          align: shapeData.textAlign || 'left',
          textDecoration: shapeData.isStrikethrough ? 'line-through' : ''
        })
        break
    }
    
        if (shape) {
      shape.on('click', () => {
        if (store.tool.value === 'select') {
          store.selectShapes([shapeData.id])
        }
      })
      
      // Add double-click handler for text editing
      if (shapeData.type === 'text') {
        shape.on('dblclick', () => {
          editText(shapeData)
        })
      }
      
      shape.on('dragend', (e) => {
        store.updateShape(shapeData.id, {
          x: e.target.x(),
          y: e.target.y()
        })
      })
      
      if (store.tool.value === 'select') {
        shape.draggable(true)
      }
      
      layer?.add(shape)
    }
  }
  
  layer.draw()
}

function updateSelection(selectedShapes: Shape[]) {
  if (!layer) return

  layer.children.forEach(shape => {
    if (shape instanceof Konva.Shape) {
      const isSelected = selectedShapes.some(s => s.id === shape.id())
      const originalStroke = shape.getAttr('originalStroke') || shape.stroke()
      const originalStrokeWidth = shape.getAttr('originalStrokeWidth') || shape.strokeWidth()
      
      if (isSelected) {
        shape.setAttrs({
          originalStroke: originalStroke,
          originalStrokeWidth: originalStrokeWidth,
          stroke: '#0066cc',
          strokeWidth: 3
        })
      } else {
        shape.setAttrs({
          stroke: originalStroke,
          strokeWidth: originalStrokeWidth
        })
      }
    }
  })
  layer.draw()
}

function handleMouseDown(_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
  if (!stage || store.tool.value === 'select') return
  
  isDrawing = true
  const pos = stage.getPointerPosition()
  if (!pos) return

  const style = store.style.value
  
  switch (store.tool.value) {
    case 'rectangle':
      currentShape = {
        type: 'rectangle',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth
      }
      break
      
    case 'circle':
      currentShape = {
        type: 'circle',
        x: pos.x,
        y: pos.y,
        radius: 0,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth
      }
      break
      
    case 'line':
    case 'pencil':
      currentShape = {
        type: 'line',
        x: pos.x,
        y: pos.y,
        points: [pos.x, pos.y],
        stroke: style.stroke,
        strokeWidth: style.strokeWidth
      }
      break
      
    case 'text':
      // For text, we create it immediately on click
      const textShape = {
        type: 'text' as const,
        x: pos.x,
        y: pos.y,
        text: 'Double click to edit',
        fontSize: 24,
        fontFamily: 'Arial',
        fontStyle: 'normal',
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: 0,
        textAlign: 'left'
      }
      store.addShape(textShape)
      store.setTool('select') // Switch back to select tool after creating text
      break
  }
}

async function handleMouseMove(_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
  if (!isDrawing || !currentShape || !stage) return
  
  const pos = stage.getPointerPosition()
  if (!pos) return
  
  switch (currentShape.type) {
    case 'rectangle':
      if (currentShape.x !== undefined && currentShape.y !== undefined) {
        currentShape.width = pos.x - currentShape.x
        currentShape.height = pos.y - currentShape.y
      }
      break
      
         case 'circle':
       if (typeof currentShape.x === 'number' && typeof currentShape.y === 'number') {
         const radius = Math.sqrt(
           Math.pow(pos.x - currentShape.x, 2) + 
           Math.pow(pos.y - currentShape.y, 2)
         )
         currentShape.radius = radius
       }
       break
      
         case 'line':
       if (currentShape.points && typeof currentShape.x === 'number' && typeof currentShape.y === 'number') {
         if (store.tool.value === 'pencil') {
           currentShape.points.push(pos.x, pos.y)
         } else {
           currentShape.points = [currentShape.x, currentShape.y, pos.x, pos.y]
         }
       }
       break
  }
  
  // Temporarily draw current shape
  await redrawWithCurrentShape()
}

function handleMouseUp() {
  if (!isDrawing || !currentShape) return
  
  isDrawing = false
  
  // Add completed shape to store
  if (isValidShape(currentShape)) {
    store.addShape(currentShape as Omit<Shape, 'id' | 'createdAt'>)
  }
  
  currentShape = null
}

function handleClick(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
  if (store.tool.value === 'select' && e.target === stage) {
    store.clearSelection()
  }
}

function isValidShape(shape: Partial<Shape>): boolean {
  switch (shape.type) {
    case 'rectangle':
      return Math.abs(shape.width || 0) > 5 && Math.abs(shape.height || 0) > 5
    case 'circle':
      return (shape.radius || 0) > 5
    case 'line':
      return (shape.points?.length || 0) >= 4
    default:
      return false
  }
}

async function redrawWithCurrentShape() {
  await redrawCanvas(store.shapes.value)
  
  if (currentShape && layer) {
    let tempShape: Konva.Shape | null = null
    
    switch (currentShape.type) {
      case 'rectangle':
        if (currentShape.width !== undefined && currentShape.height !== undefined) {
          tempShape = new Konva.Rect({
            x: currentShape.x,
            y: currentShape.y,
            width: currentShape.width,
            height: currentShape.height,
            fill: currentShape.fill,
            stroke: currentShape.stroke,
            strokeWidth: currentShape.strokeWidth
          })
        }
        break
      case 'circle':
        if (currentShape.radius !== undefined) {
          tempShape = new Konva.Circle({
            x: currentShape.x,
            y: currentShape.y,
            radius: currentShape.radius,
            fill: currentShape.fill,
            stroke: currentShape.stroke,
            strokeWidth: currentShape.strokeWidth
          })
        }
        break
      case 'line':
        if (currentShape.points) {
          tempShape = new Konva.Line({
            points: currentShape.points,
            stroke: currentShape.stroke,
            strokeWidth: currentShape.strokeWidth,
            lineCap: 'round',
            lineJoin: 'round'
          })
        }
        break
    }
    
    if (tempShape) {
      tempShape.opacity(0.7)
      layer.add(tempShape)
      layer.draw()
    }
  }
}

function duplicateSelected() {
  store.duplicateShapes()
}

function deleteSelected() {
  store.deleteShapes()
}

function updateFill(event: Event) {
  const target = event.target as HTMLInputElement
  store.updateStyle({ fill: target.value })
}

function updateStroke(event: Event) {
  const target = event.target as HTMLInputElement
  store.updateStyle({ stroke: target.value })
}

function updateStrokeWidth(event: Event) {
  const target = event.target as HTMLInputElement
  store.updateStyle({ strokeWidth: parseInt(target.value) })
}

// Text-related computed properties
const hasSelectedText = computed(() => 
  store.selectedShapes.value.some(shape => shape.type === 'text')
)

const selectedTextFontSize = computed(() => {
  const textShapes = store.selectedShapes.value.filter(s => s.type === 'text')
  return textShapes.length > 0 ? textShapes[0].fontSize || 24 : 24
})

const selectedTextFontFamily = computed(() => {
  const textShapes = store.selectedShapes.value.filter(s => s.type === 'text')
  return textShapes.length > 0 ? textShapes[0].fontFamily || 'Arial' : 'Arial'
})

// Rich text editor computed properties
const formattedPreview = computed(() => {
  let text = editingText.value
  
  // Handle math mode first
  if (currentFormat.value.isMath) {
    try {
      return katex.renderToString(text, {
        displayMode: currentFormat.value.mathDisplayMode,
        throwOnError: false
      })
    } catch (error: any) {
      return `<div class="math-error">Invalid LaTeX: ${error?.message || 'Unknown error'}</div>`
    }
  }
  
  if (currentFormat.value.isBullet) {
    text = text.split('\n').map((line: string) => line.trim() ? `• ${line}` : '').join('\n')
  }
  
  if (currentFormat.value.isBold) {
    text = `<strong>${text}</strong>`
  }
  
  if (currentFormat.value.isItalic) {
    text = `<em>${text}</em>`
  }
  
  if (currentFormat.value.isStrikethrough) {
    text = `<s>${text}</s>`
  }
  
  return text.replace(/\n/g, '<br>')
})

const previewStyle = computed(() => {
  const textShapes = store.selectedShapes.value.filter(s => s.type === 'text')
  const shape = textShapes.length > 0 ? textShapes[0] : null
  
  return {
    fontSize: `${shape?.fontSize || 24}px`,
    fontFamily: shape?.fontFamily || 'Arial',
    color: shape?.fill || store.style.value.fill,
    lineHeight: '1.4'
  }
})

// Math rendering functions
async function renderMathToImageData(text: string, displayMode: boolean = true): Promise<string | null> {
  try {
    // Create a temporary container element
    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '-9999px'
    tempDiv.style.visibility = 'hidden'
    tempDiv.style.background = 'white'
    tempDiv.style.padding = '10px'
    tempDiv.style.fontFamily = 'KaTeX_Main, Times New Roman, serif'
    tempDiv.style.fontSize = displayMode ? '24px' : '18px'
    tempDiv.style.color = '#333'
    
    // Render KaTeX to the container
    const mathHtml = katex.renderToString(text, {
      displayMode,
      throwOnError: false
    })
    
    tempDiv.innerHTML = mathHtml
    document.body.appendChild(tempDiv)
    
    // Wait for fonts to load
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Get the rendered dimensions
    const rect = tempDiv.getBoundingClientRect()
    const width = Math.max(rect.width + 20, 50) // Add padding
    const height = Math.max(rect.height + 20, 30) // Add padding
    
    // Create canvas for manual rendering
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      document.body.removeChild(tempDiv)
      return null
    }
    
    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)
    
    // Set white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)
    
    // Render text using a simple approach that avoids CORS issues
    ctx.fillStyle = '#333'
    ctx.font = `${displayMode ? '24' : '18'}px KaTeX_Main, Times New Roman, serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    
    // For complex math, we'll render a simplified version
    const simplifiedText = renderSimplifiedMath(text, displayMode)
    const lines = simplifiedText.split('\n')
    const lineHeight = displayMode ? 32 : 24
    
    lines.forEach((line, index) => {
      ctx.fillText(line, 10, 10 + (index * lineHeight))
    })
    
    // Clean up
    document.body.removeChild(tempDiv)
    
    // Return canvas as data URL
    return canvas.toDataURL('image/png')
    
  } catch (error) {
    console.warn('Failed to render math to image:', error)
    return null
  }
}

// Helper function to render simplified math notation
function renderSimplifiedMath(latex: string, displayMode: boolean): string {
  try {
    // Simple LaTeX to Unicode/text conversion for canvas rendering
    let text = latex
    
    // Common LaTeX symbols to Unicode
    const replacements: Record<string, string> = {
      '\\alpha': 'α',
      '\\beta': 'β',
      '\\gamma': 'γ',
      '\\delta': 'δ',
      '\\epsilon': 'ε',
      '\\theta': 'θ',
      '\\lambda': 'λ',
      '\\mu': 'μ',
      '\\pi': 'π',
      '\\sigma': 'σ',
      '\\phi': 'φ',
      '\\omega': 'ω',
      '\\sum': 'Σ',
      '\\int': '∫',
      '\\infty': '∞',
      '\\pm': '±',
      '\\times': '×',
      '\\div': '÷',
      '\\le': '≤',
      '\\ge': '≥',
      '\\ne': '≠',
      '\\approx': '≈',
      '\\in': '∈',
      '\\subset': '⊂',
      '\\cup': '∪',
      '\\cap': '∩',
      '\\sqrt': '√',
    }
    
    // Apply replacements
    for (const [latex, unicode] of Object.entries(replacements)) {
      text = text.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), unicode)
    }
    
    // Handle fractions - simplified representation
    text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    
    // Handle superscripts and subscripts - simplified
    text = text.replace(/\^(\{[^}]+\}|\w)/g, (_match, content) => {
      const clean = content.replace(/[{}]/g, '')
      return `^${clean}`
    })
    text = text.replace(/_(\{[^}]+\}|\w)/g, (_match, content) => {
      const clean = content.replace(/[{}]/g, '')
      return `_${clean}`
    })
    
    // Remove remaining LaTeX commands
    text = text.replace(/\\[a-zA-Z]+/g, '')
    text = text.replace(/[{}]/g, '')
    
    // Clean up extra spaces
    text = text.replace(/\s+/g, ' ').trim()
    
    if (displayMode && text.length > 40) {
      // Break long expressions into multiple lines for display mode
      const words = text.split(' ')
      const lines: string[] = []
      let currentLine = ''
      
      for (const word of words) {
        if (currentLine.length + word.length > 40) {
          lines.push(currentLine.trim())
          currentLine = word + ' '
        } else {
          currentLine += word + ' '
        }
      }
      if (currentLine.trim()) {
        lines.push(currentLine.trim())
      }
      
      return lines.join('\n')
    }
    
    return text
    
  } catch (error) {
    return `Math: ${latex}`
  }
}

async function createKonvaImageFromData(dataURL: string, shapeData: Shape): Promise<Konva.Image | null> {
  try {
    const image = new Image()
    
    return new Promise((resolve) => {
      image.onload = () => {
        const konvaImage = new Konva.Image({
          id: shapeData.id,
          x: shapeData.x,
          y: shapeData.y,
          image: image,
          draggable: store.tool.value === 'select'
        })
        
        // Add click handlers
        konvaImage.on('click', () => {
          if (store.tool.value === 'select') {
            store.selectShapes([shapeData.id])
          }
        })
        
        konvaImage.on('dblclick', () => {
          editText(shapeData)
        })
        
        konvaImage.on('dragend', (e) => {
          store.updateShape(shapeData.id, {
            x: e.target.x(),
            y: e.target.y()
          })
        })
        
        resolve(konvaImage)
      }
      
      image.onerror = () => {
        console.warn('Failed to load math image')
        resolve(null)
      }
      
      image.src = dataURL
    })
    
  } catch (error) {
    console.warn('Failed to create Konva image:', error)
    return null
  }
}

// Rich text editor functions
function editText(shapeData: Shape) {
  if (shapeData.type !== 'text') return
  
  editingShapeId.value = shapeData.id
  editingText.value = shapeData.text || 'Double click to edit'
  
  // Load current formatting
  currentFormat.value = {
    isBold: shapeData.isBold || false,
    isItalic: shapeData.isItalic || false,
    isStrikethrough: shapeData.isStrikethrough || false,
    isBullet: shapeData.isBullet || false,
    isMath: shapeData.isMath || false,
    mathDisplayMode: shapeData.mathDisplayMode !== false // Default to true if not set
  }
  
  showRichTextEditor.value = true
}

function closeRichTextEditor() {
  showRichTextEditor.value = false
  editingShapeId.value = null
  editingText.value = ''
  currentFormat.value = {
    isBold: false,
    isItalic: false,
    isStrikethrough: false,
    isBullet: false,
    isMath: false,
    mathDisplayMode: true
  }
}

function toggleFormat(formatType: 'bold' | 'italic' | 'strikethrough' | 'bullet' | 'math') {
  switch (formatType) {
    case 'bold':
      currentFormat.value.isBold = !currentFormat.value.isBold
      break
    case 'italic':
      currentFormat.value.isItalic = !currentFormat.value.isItalic
      break
    case 'strikethrough':
      currentFormat.value.isStrikethrough = !currentFormat.value.isStrikethrough
      break
    case 'bullet':
      currentFormat.value.isBullet = !currentFormat.value.isBullet
      break
    case 'math':
      currentFormat.value.isMath = !currentFormat.value.isMath
      // Clear other formatting when switching to/from math mode
      if (currentFormat.value.isMath) {
        currentFormat.value.isBold = false
        currentFormat.value.isItalic = false
        currentFormat.value.isStrikethrough = false
        currentFormat.value.isBullet = false
        // Reset to display mode when enabling math
        currentFormat.value.mathDisplayMode = true
      }
      break
  }
}

function updatePreview() {
  // This function is called when text changes
  // The preview is automatically updated via computed property
}

async function applyTextChanges() {
  if (!editingShapeId.value) return
  
  let updates: Partial<Shape> = {
    text: editingText.value,
    isBold: currentFormat.value.isBold,
    isItalic: currentFormat.value.isItalic,
    isStrikethrough: currentFormat.value.isStrikethrough,
    isBullet: currentFormat.value.isBullet,
    isMath: currentFormat.value.isMath,
    mathDisplayMode: currentFormat.value.mathDisplayMode,
    htmlContent: formattedPreview.value
  }
  
  // If it's math mode, render to image
  if (currentFormat.value.isMath && editingText.value.trim()) {
    try {
      const mathImageData = await renderMathToImageData(
        editingText.value,
        currentFormat.value.mathDisplayMode
      )
      if (mathImageData) {
        updates.mathImageData = mathImageData
      }
    } catch (error) {
      console.warn('Failed to render math image:', error)
    }
  } else {
    // Clear math image data for non-math text
    updates.mathImageData = undefined
  }
  
  store.updateShape(editingShapeId.value, updates)
  closeRichTextEditor()
}

// Slides management functions
function addNewSlide() {
  slidesStore.addSlide()
  slidesStore.goToSlide(slidesStore.slides.value.length - 1)
  syncCurrentSlideShapes()
}

function selectSlide(index: number) {
  saveCurrentSlideShapes()
  slidesStore.goToSlide(index)
  loadCurrentSlideShapes()
  store.clearSelection()
}

function duplicateSlide(index: number) {
  slidesStore.duplicateSlide(index)
}

function deleteSlide(index: number) {
  slidesStore.deleteSlide(index)
  loadCurrentSlideShapes()
}

function updateSlideName(index: number, name: string) {
  slidesStore.renameSlide(index, name)
}

function saveCurrentSlideShapes() {
  if (slidesStore.currentSlide.value) {
    slidesStore.updateCurrentSlideShapes([...store.shapes.value])
  }
}

function loadCurrentSlideShapes() {
  if (slidesStore.currentSlide.value) {
    // Update the canvas store with the current slide's shapes
    store.clearCanvas()
    slidesStore.currentSlide.value.shapes.forEach(shape => {
      store.addShape(shape)
    })
  }
}

function syncCurrentSlideShapes() {
  if (slidesStore.currentSlide.value) {
    slidesStore.updateCurrentSlideShapes([...store.shapes.value])
  }
}

function updateFontSize(event: Event) {
  const target = event.target as HTMLInputElement
  const fontSize = parseInt(target.value)
  
  store.selectedShapes.value.forEach(shape => {
    if (shape.type === 'text') {
      store.updateShape(shape.id, { fontSize })
    }
  })
}

function updateFontFamily(event: Event) {
  const target = event.target as HTMLSelectElement
  const fontFamily = target.value
  
  store.selectedShapes.value.forEach(shape => {
    if (shape.type === 'text') {
      store.updateShape(shape.id, { fontFamily })
    }
  })
}

function setupKeyboardShortcuts() {
  const handleKeydown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault()
      store.undo()
    } else if (
      (event.metaKey || event.ctrlKey) && 
      (event.key === 'y' || (event.key === 'z' && event.shiftKey))
    ) {
      event.preventDefault()
      store.redo()
    } else if ((event.metaKey || event.ctrlKey) && event.key === 'd') {
      event.preventDefault()
      duplicateSelected()
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      deleteSelected()
    }
  }
  
  document.addEventListener('keydown', handleKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}

function cleanup() {
  if (stage) {
    stage.destroy()
  }
}

// Slide thumbnail helper
function getMiniShapeStyle(shape: Shape) {
  const scale = 0.1 // Scale down shapes for thumbnail
  const style: any = {
    position: 'absolute',
    left: `${Math.max(0, Math.min(80, shape.x * scale))}%`,
    top: `${Math.max(0, Math.min(80, shape.y * scale))}%`,
    backgroundColor: shape.fill || '#e9ecef',
    border: `1px solid ${shape.stroke || '#dee2e6'}`,
  }

  switch (shape.type) {
    case 'rectangle':
      style.width = `${Math.min(20, (shape.width || 100) * scale)}%`
      style.height = `${Math.min(20, (shape.height || 100) * scale)}%`
      break
    case 'circle':
      const radius = Math.min(10, (shape.radius || 50) * scale)
      style.width = `${radius}%`
      style.height = `${radius}%`
      style.borderRadius = '50%'
      break
    case 'text':
      style.width = '8px'
      style.height = '4px'
      style.backgroundColor = '#a855f7'
      style.border = 'none'
      break
    default:
      style.width = '6px'
      style.height = '6px'
  }

  return style
}

// AI Generation Functions
function closeAIModal() {
  showAIModal.value = false
  // Reset form
  aiRequest.value = {
    topic: '',
    slideCount: 1,
    style: 'professional' as 'professional' | 'creative' | 'minimal' | 'academic',
    language: 'en',
    includeImages: true,
    generationMode: 'replace' as 'replace' | 'append' | 'insert'
  }
}

async function generateSlides() {
  try {
    const result = await slidesStore.generateSlidesWithAI(aiRequest.value)
    
    if (result.success) {
      // Load the current slide
      loadCurrentSlideShapes()
      closeAIModal()
      
      // Show success notification based on generation mode
      const modeMessage: Record<string, string> = {
        replace: `Successfully replaced with ${result.slidesGenerated} AI-generated slides!`,
        append: `Successfully added ${result.slidesGenerated} slides to the end. Total: ${result.totalSlides} slides.`,
        insert: `Successfully inserted ${result.slidesGenerated} slides after current slide. Total: ${result.totalSlides} slides.`
      }
      
      console.log(modeMessage[result.mode || ''] || `Successfully generated ${result.slidesGenerated} slides!`)
    } else {
      console.error('Failed to generate slides:', result.error)
      // You could show an error toast here
    }
  } catch (error) {
    console.error('Error generating slides:', error)
  }
}

function closeEnhanceModal() {
  showEnhanceModal.value = false
  enhancePrompt.value = ''
  enhanceSlideIndex.value = null
}

async function enhanceSlide() {
  if (enhanceSlideIndex.value === null) return
  
  try {
    const result = await slidesStore.enhanceSlideWithAI(enhanceSlideIndex.value, enhancePrompt.value)
    
    if (result.success) {
      // Reload current slide if it's the one being enhanced
      if (enhanceSlideIndex.value === slidesStore.currentSlideIndex.value) {
        loadCurrentSlideShapes()
      }
      closeEnhanceModal()
      
      console.log('Slide enhanced successfully!')
    } else {
      console.error('Failed to enhance slide:', result.error)
    }
  } catch (error) {
    console.error('Error enhancing slide:', error)
  }
}

// Settings modal functions
function closeSettingsModal() {
  showSettingsModal.value = false
  showApiKey.value = false
  // Reset temp values
  const currentProvider = slidesStore.aiService.providers.value.find(p => p.name === 'OpenRouter')
  tempApiKey.value = currentProvider?.apiKey || ''
  tempModel.value = currentProvider?.model || 'deepseek/deepseek-chat:free'
}

function saveSettings() {
  // Update the OpenRouter provider
  slidesStore.aiService.updateProvider('OpenRouter', {
    apiKey: tempApiKey.value,
    model: tempModel.value,
    enabled: !!tempApiKey.value
  })
  
  closeSettingsModal()
  console.log('API settings saved successfully!')
}

</script>

<style scoped>
.canvas-editor {
  display: flex;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #f8f9fa;
}

.slides-panel {
  width: 300px;
  min-width: 300px;
  background: white;
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
}

.slides-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: white;
}

.slides-header h3 {
  margin: 0;
  color: #495057;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.add-slide-btn {
  padding: 10px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 500;
  background: #a855f7;
  color: white;
  border: none;
  transition: all 0.2s ease;
}

.add-slide-btn:hover {
  background: #9333ea;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(168, 85, 247, 0.3);
}

.ai-btn {
  padding: 8px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  background: linear-gradient(135deg, #a855f7, #8b5cf6);
  color: white;
  border: none;
  transition: all 0.2s ease;
  margin-right: 8px;
}

.ai-btn:hover {
  background: linear-gradient(135deg, #9333ea, #7c3aed);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
}

.slides-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f8f9fa;
}

.slide-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-item:hover {
  border-color: #a855f7;
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.15);
  transform: translateY(-2px);
}

.slide-item.active {
  border-color: #a855f7;
  box-shadow: 0 6px 16px rgba(168, 85, 247, 0.2);
  transform: translateY(-2px);
}

.slide-preview {
  position: relative;
  aspect-ratio: 16/9;
  background: #f8f9fa;
  overflow: hidden;
}

.slide-number {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(255, 255, 255, 0.95);
  color: #495057;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  z-index: 1;
  border: 1px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.slide-thumbnail {
  width: 100%;
  height: 100%;
  background: white;
  border: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-canvas {
  width: 100%;
  height: 100%;
  position: relative;
}

.mini-shapes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
}

.mini-shape {
  width: 20px;
  height: 20px;
  background: white;
  border: 1px solid #e9ecef;
}

.more-shapes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  font-size: 12px;
  font-weight: 500;
}

.slide-info {
  padding: 12px 16px;
  background: white;
}

.slide-name-input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
  padding: 4px 0;
}

.slide-name-input:focus {
  outline: 2px solid #a855f7;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
}

.slide-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.slide-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  font-size: 12px;
  transition: all 0.2s ease;
  color: #6c757d;
}

.slide-action-btn:hover {
  background: #f8f9fa;
  color: #495057;
}

.slide-action-btn.delete:hover {
  background: #fff5f5;
  color: #dc3545;
}

.slide-action-btn.ai-enhance {
  color: #a855f7;
}

.slide-action-btn.ai-enhance:hover {
  background: #f3e8ff;
  color: #9333ea;
}

.slide-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.toolbar {
  display: flex;
  flex-direction: column;
  background: white;
  border-bottom: 1px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  min-height: 64px;
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
}

.toolbar-primary {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  overflow-x: auto;
}

.toolbar-secondary {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  overflow-x: auto;
  border-top: 1px solid #f1f3f4;
  background: #fafbfc;
  padding: 12px 24px;
  min-height: 60px;
}

.toolbar-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tools-group {
  gap: 4px;
}

.actions-group {
  gap: 16px;
}

.style-controls-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.text-controls-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.utility-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.control-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
}

.control-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6c757d;
  font-weight: 600;
  margin-bottom: 4px;
}

.color-input {
  width: 32px;
  height: 32px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  background: white;
  padding: 0;
}

.range-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-input {
  width: 80px;
  accent-color: #a855f7;
  margin: 0;
}

.range-value {
  font-size: 11px;
  color: #6c757d;
  min-width: 28px;
  text-align: center;
  margin-top: 2px;
}

.number-input,
.select-input {
  padding: 6px 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 12px;
  background: white;
  color: #495057;
  width: 60px;
}

.select-input {
  width: 80px;
}

.tool-btn {
  min-width: 90px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.tool-btn:hover:not(.active) {
  background: #f8f9fa;
  border-color: #e9ecef;
}

.tool-btn.active {
  background: #a855f7;
  color: white;
  border-color: #a855f7;
  box-shadow: 0 2px 8px rgba(168, 85, 247, 0.2);
}

.tool-label {
  font-size: 11px;
  text-transform: capitalize;
  font-weight: 500;
}

.canvas-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f8f9fa;
  overflow: hidden;
  padding: 24px;
}

.konva-container {
  border: 1px solid #dee2e6;
  background: white;
  background-size: 20px 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  overflow: hidden;
}

.status {
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #e9ecef;
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: #6c757d;
}

.status p {
  margin: 0;
  font-weight: 500;
}

label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

input[type="color"] {
  width: 36px;
  height: 36px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  cursor: pointer;
  background: white;
}

input[type="range"] {
  width: 100px;
  accent-color: #a855f7;
}

.text-controls select,
.text-controls input[type="number"] {
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  color: #495057;
}

/* Rich Text Editor Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.rich-text-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
  border-radius: 16px 16px 0 0;
}

.modal-header h3 {
  margin: 0;
  color: #495057;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6c757d;
  padding: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e9ecef;
  color: #495057;
}

.formatting-toolbar {
  display: flex;
  gap: 8px;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
  background: white;
}

.format-btn {
  padding: 10px 12px;
  color: #495057;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.format-btn:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
  transform: translateY(-1px);
}

.format-btn.active {
  background: #a855f7;
  color: white;
  border-color: #a855f7;
  box-shadow: 0 2px 4px rgba(168, 85, 247, 0.3);
}

.text-editor {
  padding: 24px;
  background: white;
}

.text-editor textarea {
  width: 100%;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  line-height: 1.5;
  color: #495057;
  transition: border-color 0.2s ease;
}

.text-editor textarea:focus {
  outline: none;
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.15);
}

.text-preview {
  padding: 24px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.text-preview h4 {
  margin: 0 0 16px 0;
  color: #495057;
  font-size: 16px;
  font-weight: 600;
}

.preview-content {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  background: white;
  min-height: 60px;
  white-space: pre-wrap;
  color: #495057;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
  border-radius: 0 0 16px 16px;
}

.cancel-btn {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.cancel-btn:hover {
  background: #5a6268;
  border-color: #545b62;
}

.apply-btn {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.apply-btn:hover {
  background: #218838;
  border-color: #1e7e34;
}

.btn {
  padding: 10px 16px;
  border: 1px solid #dee2e6;
  background: white;
  color: #495057;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f8f9fa;
}

.btn:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #adb5bd;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn.active {
  background: #a855f7;
  color: white;
  border-color: #a855f7;
  box-shadow: 0 2px 4px rgba(168, 85, 247, 0.3);
}

.btn.btn-danger {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.btn.btn-danger:hover:not(:disabled) {
  background: #c82333;
  border-color: #bd2130;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2);
}

.btn.btn-icon {
  padding: 10px;
  border-radius: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #495057;
  transition: all 0.2s ease;
}

.btn.btn-icon:hover:not(:disabled) {
  background: #f8f9fa;
}

.btn.btn-secondary {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  color: #495057;
  transition: all 0.2s ease;
  gap: 6px;
}

.btn.btn-secondary:hover:not(:disabled) {
  background: #f8f9fa;
}

.btn.btn-ghost {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  color: #495057;
  transition: all 0.2s ease;
  gap: 6px;
}

.btn.btn-ghost:hover:not(:disabled) {
  background: #f8f9fa;
}

.btn.btn-danger-outline {
  background: none;
  border: 1px solid #dc3545;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  color: #dc3545;
  transition: all 0.2s ease;
  gap: 6px;
}

.btn.btn-danger-outline:hover:not(:disabled) {
  background: #dc3545;
  color: white;
}

/* AI Modal Styles */
.ai-modal, .enhance-modal {
  max-width: 650px;
  width: 90vw;
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.modal-header {
  padding: 32px 32px 24px 32px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
  position: relative;
}

.modal-header h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.025em;
}

.close-btn {
  position: absolute;
  top: 24px;
  right: 24px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: #64748b;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #334155;
}

.ai-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0;
}

.ai-form {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-hint {
  font-size: 13px;
  color: #64748b;
  margin-top: 6px;
  line-height: 1.4;
}

.topic-textarea {
  color: #222;
  width: 100%;
  min-height: 120px;
  padding: 16px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.2s ease;
  background: #fafbfc;
}

.topic-textarea:focus {
  outline: none;
  border-color: #a855f7;
  background: white;
  box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.08);
}

.topic-textarea::placeholder {
  color: #94a3b8;
}

.number-input, .select-input {
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  background: #fafbfc;
  transition: all 0.2s ease;
  color: #334155;
}

.number-input:focus, .select-input:focus {
  outline: none;
  border-color: #a855f7;
  background: white;
  box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.08);
}

.select-input {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
}

.checkbox-group {
  margin-top: 8px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 15px;
  color: #374151;
  font-weight: 500;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  accent-color: #a855f7;
  cursor: pointer;
}

.checkbox-text {
  user-select: none;
}

.modal-actions {
  padding: 24px 32px 32px 32px;
  background: #fafbfc;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

.cancel-btn {
  padding: 12px 24px;
  border: 2px solid #e2e8f0;
  background: white;
  color: #64748b;
  border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  border-color: #cbd5e1;
  color: #475569;
  background: #f8fafc;
}

.generate-btn, .enhance-btn {
  background: linear-gradient(135deg, #a855f7, #8b5cf6);
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
  min-width: 160px;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
}

.generate-btn:hover, .enhance-btn:hover {
  background: linear-gradient(135deg, #9333ea, #7c3aed);
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(168, 85, 247, 0.4);
}

.generate-btn:disabled, .enhance-btn:disabled {
  background: linear-gradient(135deg, #d1d5db, #9ca3af);
  color: #6b7280;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Loading state animations */
@keyframes shimmer {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}

.generate-btn:disabled, .enhance-btn:disabled {
  animation: shimmer 2s ease-in-out infinite;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .ai-modal, .enhance-modal {
    width: 95vw;
    max-width: none;
    margin: 20px;
  }
  
  .modal-header {
    padding: 24px 24px 20px 24px;
  }
  
  .modal-header h3 {
    font-size: 20px;
  }
  
  .ai-form {
    padding: 24px;
    gap: 24px;
  }
  
  .modal-actions {
    padding: 20px 24px 24px 24px;
    flex-direction: column;
  }
  
    .cancel-btn, .generate-btn, .enhance-btn {
    width: 100%;
    justify-content: center;
  }
}

.settings-btn {
  padding: 8px 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #6b7280;
  color: white;
  border: none;
  transition: all 0.2s ease;
}

.settings-btn:hover {
  background: #4b5563;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(107, 114, 128, 0.3);
}

/* Settings Modal Styles */
.settings-modal {
  max-width: 550px;
  width: 90vw;
}

.settings-form {
  padding: 32px;
}

.api-provider-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.api-provider-section h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.provider-description {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.provider-description a {
  color: #a855f7;
  text-decoration: none;
  font-weight: 500;
}

.provider-description a:hover {
  text-decoration: underline;
}

.api-key-input-group {
  display: flex;
  align-items: center;
  position: relative;
}

.api-key-input {
  flex: 1;
  padding: 14px 50px 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
  background: #fafbfc;
  transition: all 0.2s ease;
  color: #334155;
}

.api-key-input:focus {
  outline: none;
  border-color: #a855f7;
  background: white;
  box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.08);
}

.toggle-visibility-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: #6b7280;
  transition: color 0.2s ease;
}

.toggle-visibility-btn:hover {
  color: #374151;
}

.api-status {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.status-indicator.connected {
  color: #059669;
}

.status-indicator.disconnected {
  color: #dc2626;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.save-btn {
  background: linear-gradient(135deg, #059669, #047857);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-btn:hover {
  background: linear-gradient(135deg, #047857, #065f46);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(5, 150, 105, 0.3);
}

/* API Warning Styles */
.api-warning {
  margin: 0 32px;
  padding: 20px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 1px solid #f59e0b;
  border-radius: 12px;
  margin-bottom: 24px;
}

.warning-content {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #92400e;
}

.warning-content > svg {
  flex-shrink: 0;
  color: #f59e0b;
}

.warning-content > div {
  flex: 1;
}

.warning-content strong {
  font-weight: 600;
  color: #78350f;
  display: block;
  margin-bottom: 4px;
}

.warning-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

.setup-btn {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.setup-btn:hover {
  background: #d97706;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
}

/* Disabled state styles */
.topic-textarea:disabled,
.number-input:disabled,
.select-input:disabled,
.checkbox-input:disabled {
  background: #f1f5f9;
  color: #64748b;
  cursor: not-allowed;
}

.checkbox-text {
  color: inherit;
}

.checkbox-label:has(.checkbox-input:disabled) .checkbox-text {
  color: #64748b;
}

/* Radio Button Group Styles */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.radio-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: #fafbfc;
  transition: all 0.2s ease;
}

.radio-label:hover:not(:has(.radio-input:disabled)) {
  border-color: #a855f7;
  background: #faf5ff;
}

.radio-label:has(.radio-input:checked) {
  border-color: #a855f7;
  background: #faf5ff;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
}

.radio-label:has(.radio-input:disabled) {
  background: #f1f5f9;
  cursor: not-allowed;
}

.radio-input {
  width: 20px;
  height: 20px;
  accent-color: #a855f7;
  cursor: pointer;
  margin: 0;
  flex-shrink: 0;
}

.radio-input:disabled {
  cursor: not-allowed;
}

.radio-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.radio-text strong {
  font-weight: 600;
  color: #374151;
  font-size: 15px;
}

.radio-text small {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
}

.radio-label:has(.radio-input:disabled) .radio-text strong,
.radio-label:has(.radio-input:disabled) .radio-text small {
  color: #9ca3af;
}

/* Math Help Styles */
.math-help {
  margin-top: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.math-help details {
  cursor: pointer;
}

.math-help summary {
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
  outline: none;
  user-select: none;
}

.math-help summary::-webkit-details-marker {
  color: #a855f7;
}

.math-examples {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.example {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  color: #4b5563;
}

.example code {
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', monospace;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  min-width: 120px;
}

/* Math Error Styles */
.math-error {
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 12px;
  font-size: 14px;
  font-family: monospace;
}

/* Math Mode Toggle Styles */
.math-mode-toggle {
  display: flex;
  gap: 4px;
  margin-left: 8px;
  padding: 4px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.mini-btn {
  padding: 6px 10px !important;
  font-size: 12px !important;
  min-width: unset !important;
  font-weight: 600;
  font-family: 'Times New Roman', serif;
}

.mini-btn:first-child {
  font-size: 14px !important;
  font-weight: bold;
}

.mini-btn.active {
  background: #a855f7 !important;
  color: white !important;
  border-color: #a855f7 !important;
  box-shadow: 0 2px 4px rgba(168, 85, 247, 0.3) !important;
}
</style> 
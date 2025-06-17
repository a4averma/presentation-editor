import { ref, computed } from 'vue'
import type { Shape } from './useCanvasStore'
import { useAIService, type SlideContentRequest, type GeneratedSlideContent } from './useAIService'

export interface Slide {
  id: string
  name: string
  shapes: Shape[]
  background: string
  thumbnail?: string
  createdAt: string
}

export function useSlidesStore() {
  const aiService = useAIService()

  // Generate unique IDs
  function generateId(): string {
    return `slide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Create a new slide
  function createNewSlide(name: string = 'New Slide'): Slide {
    return {
      id: generateId(),
      name,
      shapes: [],
      background: '#ffffff',
      createdAt: new Date().toISOString()
    }
  }

  // Slides state
  const slides = ref<Slide[]>([createNewSlide('Slide 1')])
  const currentSlideIndex = ref(0)

  // Computed properties
  const currentSlide = computed(() => slides.value[currentSlideIndex.value])
  const slideCount = computed(() => slides.value.length)

  // Slide operations
  function addSlide(name?: string): string {
    const newSlide = createNewSlide(name || `Slide ${slides.value.length + 1}`)
    slides.value.push(newSlide)
    return newSlide.id
  }

  function deleteSlide(index: number): void {
    if (slides.value.length <= 1) return // Don't delete the last slide

    slides.value.splice(index, 1)

    // Adjust current slide index if necessary
    if (currentSlideIndex.value >= slides.value.length) {
      currentSlideIndex.value = slides.value.length - 1
    } else if (currentSlideIndex.value > index) {
      currentSlideIndex.value--
    }
  }

  function duplicateSlide(index: number): void {
    const originalSlide = slides.value[index]
    if (!originalSlide) return

    const duplicatedSlide: Slide = {
      ...originalSlide,
      id: generateId(),
      name: `${originalSlide.name} Copy`,
      shapes: originalSlide.shapes.map(shape => ({
        ...shape,
        id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })),
      createdAt: new Date().toISOString()
    }

    slides.value.splice(index + 1, 0, duplicatedSlide)
  }

  function goToSlide(index: number): void {
    if (index >= 0 && index < slides.value.length) {
      currentSlideIndex.value = index
    }
  }

  function updateSlide(index: number, updates: Partial<Slide>): void {
    if (slides.value[index]) {
      slides.value[index] = { ...slides.value[index], ...updates }
    }
  }

  function updateCurrentSlideShapes(shapes: Shape[]): void {
    if (currentSlide.value) {
      currentSlide.value.shapes = shapes
    }
  }

  function renameSlide(index: number, name: string): void {
    if (slides.value[index]) {
      slides.value[index].name = name
    }
  }

  function moveSlide(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= slides.value.length ||
      toIndex < 0 || toIndex >= slides.value.length) {
      return
    }

    const [movedSlide] = slides.value.splice(fromIndex, 1)
    slides.value.splice(toIndex, 0, movedSlide)

    // Update current slide index
    if (currentSlideIndex.value === fromIndex) {
      currentSlideIndex.value = toIndex
    } else if (fromIndex < currentSlideIndex.value && toIndex >= currentSlideIndex.value) {
      currentSlideIndex.value--
    } else if (fromIndex > currentSlideIndex.value && toIndex <= currentSlideIndex.value) {
      currentSlideIndex.value++
    }
  }

  // Generate thumbnail for a slide
  function generateThumbnail(slide: Slide): string {
    // This would typically be generated from the canvas
    // For now, return a placeholder or empty string
    return ''
  }

  // AI Generation functions
  async function generateSlidesWithAI(request: SlideContentRequest) {
    try {
      const result = await aiService.generateSlideContent(request)

      if (result.success) {
        // Clear existing slides except the first one
        slides.value = [slides.value[0]]
        currentSlideIndex.value = 0

        // Generate slides from AI content
        result.slides.forEach((content, index) => {
          const slideName = content.title || `AI Generated Slide ${index + 1}`
          const newSlideId = addSlide(slideName)
          const slideIndex = slides.value.length - 1

          // Generate shapes from AI content
          const shapes = aiService.generateShapesFromContent(content)

          // Update the slide with generated shapes
          updateSlide(slideIndex, { shapes })
        })

        // Go to first generated slide
        goToSlide(0)

        return { success: true, slidesGenerated: result.slides.length }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate slides'
      }
    }
  }

  async function enhanceSlideWithAI(slideIndex: number, prompt: string) {
    const slide = slides.value[slideIndex]
    if (!slide) return { success: false, error: 'Slide not found' }

    try {
      // Create a request for a single slide enhancement
      const request: SlideContentRequest = {
        topic: `${slide.name}: ${prompt}`,
        slideCount: 1,
        style: 'professional',
        includeImages: false,
        language: 'en'
      }

      const result = await aiService.generateSlideContent(request)

      if (result.success && result.slides.length > 0) {
        const enhancedContent = result.slides[0]
        const newShapes = aiService.generateShapesFromContent(enhancedContent)

        // Merge with existing shapes or replace
        const updatedShapes = [...slide.shapes, ...newShapes]
        updateSlide(slideIndex, {
          shapes: updatedShapes,
          name: enhancedContent.title || slide.name
        })

        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enhance slide'
      }
    }
  }

  return {
    // State
    slides,
    currentSlideIndex,
    currentSlide,
    slideCount,

    // Operations
    addSlide,
    deleteSlide,
    duplicateSlide,
    goToSlide,
    updateSlide,
    updateCurrentSlideShapes,
    renameSlide,
    moveSlide,
    generateThumbnail,

    // AI Generation
    generateSlidesWithAI,
    enhanceSlideWithAI,

    // AI Service access
    aiService
  }
} 
import { ref, type Ref } from 'vue'
import type { Shape } from './useCanvasStore'

export interface AIProvider {
  name: string
  apiKey: string
  enabled: boolean
  model?: string
}

export interface SlideContentRequest {
  topic: string
  slideCount: number
  style: 'professional' | 'creative' | 'minimal' | 'academic'
  includeImages: boolean
  language: string
}

export interface GeneratedSlideContent {
  title: string
  content: string[]
  notes?: string
  suggestedElements: {
    type: 'text' | 'shape' | 'image'
    content: string
    position: { x: number; y: number }
    style?: any
  }[]
}

export interface AIGenerationResult {
  success: boolean
  slides: GeneratedSlideContent[]
  error?: string
}

export function useAIService() {
  const isGenerating = ref(false)
  const providers = ref<AIProvider[]>([
    {
      name: 'OpenRouter',
      apiKey: localStorage.getItem('openrouter_api_key') || '',
      enabled: !!localStorage.getItem('openrouter_api_key'),
      model: 'deepseek/deepseek-chat:free'
    },
    { name: 'OpenAI', apiKey: '', enabled: false },
    { name: 'Anthropic', apiKey: '', enabled: false }
  ])

  const defaultProvider = ref<string>('OpenRouter')

  // OpenRouter API configuration
  const OPENROUTER_CONFIG = {
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    siteUrl: 'https://localhost:5173', // Update with your actual site URL
    siteName: 'Konva Presentation Maker'
  }

  // Generate comprehensive prompt for slide creation
  function generateSlidePrompt(request: SlideContentRequest): string {
    const styleDescriptions = {
      professional: 'Professional business style with clear structure, data-driven content, and formal language',
      creative: 'Creative and engaging style with innovative concepts, visual metaphors, and inspiring language',
      minimal: 'Minimal and clean style with essential information only, simple structure, and concise points',
      academic: 'Academic style with research-based content, theoretical frameworks, and scholarly language'
    }

    return `You are an expert presentation designer. Create ${request.slideCount} professional slides about "${request.topic}".

STYLE: ${styleDescriptions[request.style]}
LANGUAGE: ${request.language}
VISUAL ELEMENTS: ${request.includeImages ? 'Include suggestions for visual elements and shapes' : 'Text-only content'}

REQUIREMENTS:
1. Each slide should have a clear, compelling title
2. Use 3-5 bullet points per slide maximum
3. Keep content concise and impactful
4. Ensure logical flow between slides
5. Include speaker notes for context

RESPONSE FORMAT (JSON only):
{
  "slides": [
    {
      "title": "Slide Title Here",
      "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
      "notes": "Speaker notes with additional context and talking points",
      "suggestedElements": [
        {
          "type": "shape",
          "content": "Visual element description",
          "position": {"x": 600, "y": 100}
        }
      ]
    }
  ]
}

Create slides that tell a complete story about ${request.topic}. Make each slide valuable and actionable.`
  }

  // Real AI generation using OpenRouter
  async function generateSlideContent(request: SlideContentRequest): Promise<AIGenerationResult> {
    isGenerating.value = true

    try {
      const provider = providers.value.find(p => p.name === defaultProvider.value)

      if (!provider || !provider.enabled || !provider.apiKey) {
        return {
          success: false,
          slides: [],
          error: 'OpenRouter API key not configured. Please add your API key in settings.'
        }
      }

      const prompt = generateSlidePrompt(request)

      const response = await fetch(OPENROUTER_CONFIG.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${provider.apiKey}`,
          "HTTP-Referer": OPENROUTER_CONFIG.siteUrl,
          "X-Title": OPENROUTER_CONFIG.siteName,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": provider.model || "deepseek/deepseek-chat:free",
          "messages": [
            {
              "role": "system",
              "content": "You are an expert presentation designer. Always respond with valid JSON only. No additional text or explanations."
            },
            {
              "role": "user",
              "content": prompt
            }
          ],
          "temperature": 0.7,
          "max_tokens": 2000
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const aiResponse = data.choices?.[0]?.message?.content

      if (!aiResponse) {
        throw new Error('No response from AI model')
      }

      // Parse JSON response
      let parsedResponse
      try {
        // Clean the response in case there's extra text
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        const jsonString = jsonMatch ? jsonMatch[0] : aiResponse
        parsedResponse = JSON.parse(jsonString)
      } catch (parseError) {
        console.error('Failed to parse AI response:', aiResponse)
        // Fallback to mock generation if parsing fails
        return generateMockSlideContent(request)
      }

      if (!parsedResponse.slides || !Array.isArray(parsedResponse.slides)) {
        throw new Error('Invalid response format from AI')
      }

      return {
        success: true,
        slides: parsedResponse.slides
      }

    } catch (error) {
      console.error('AI Generation Error:', error)

      // Fallback to mock generation on error
      console.log('Falling back to mock generation...')
      return generateMockSlideContent(request)

    } finally {
      isGenerating.value = false
    }
  }

  // Fallback mock generation
  async function generateMockSlideContent(request: SlideContentRequest): Promise<AIGenerationResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    const slides = generateMockSlides(request)

    return {
      success: true,
      slides
    }
  }

  // Generate shapes from AI content
  function generateShapesFromContent(content: GeneratedSlideContent, slideWidth = 800, slideHeight = 600): Shape[] {
    const shapes: Shape[] = []
    let yOffset = 60

    // Add title
    if (content.title) {
      shapes.push({
        id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'text',
        x: 50,
        y: yOffset,
        text: content.title,
        fontSize: 32,
        fontFamily: 'Arial',
        fill: '#2d3748',
        createdAt: new Date().toISOString(),
        isBold: true
      })
      yOffset += 80
    }

    // Add content points
    content.content.forEach((point, index) => {
      shapes.push({
        id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}`,
        type: 'text',
        x: 70,
        y: yOffset,
        text: `• ${point}`,
        fontSize: 18,
        fontFamily: 'Arial',
        fill: '#4a5568',
        createdAt: new Date().toISOString()
      })
      yOffset += 40
    })

    // Add suggested visual elements
    content.suggestedElements?.forEach((element, index) => {
      if (element.type === 'shape') {
        // Add decorative shapes
        shapes.push({
          id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_suggested_${index}`,
          type: 'rectangle',
          x: element.position.x,
          y: element.position.y,
          width: 100,
          height: 20,
          fill: '#a855f7',
          stroke: '#9333ea',
          strokeWidth: 2,
          createdAt: new Date().toISOString()
        })
      }
    })

    return shapes
  }

  // Mock slide generation (fallback)
  function generateMockSlides(request: SlideContentRequest): GeneratedSlideContent[] {
    const topics = request.topic.split(',').map(t => t.trim())
    const slidesPerTopic = Math.max(1, Math.floor(request.slideCount / topics.length))

    const allSlides: GeneratedSlideContent[] = []

    topics.forEach((topic, topicIndex) => {
      const slideCount = topicIndex === topics.length - 1
        ? request.slideCount - allSlides.length
        : slidesPerTopic

      for (let i = 0; i < slideCount; i++) {
        const slideContent = generateMockSlideForTopic(topic, i, request.style)
        allSlides.push(slideContent)
      }
    })

    return allSlides.slice(0, request.slideCount)
  }

  function generateMockSlideForTopic(topic: string, slideIndex: number, style: string): GeneratedSlideContent {
    const templates = {
      professional: {
        titles: [
          `${topic}: Overview`,
          `Key Points about ${topic}`,
          `${topic}: Analysis`,
          `Implementation of ${topic}`,
          `${topic}: Best Practices`
        ],
        contents: [
          [`Market analysis and trends`, `Current state of ${topic}`, `Future outlook and predictions`],
          [`Core principles and foundations`, `Implementation strategies`, `Measuring success and ROI`],
          [`Technical specifications`, `System requirements`, `Integration capabilities`],
          [`Step-by-step process`, `Resource allocation`, `Timeline and milestones`],
          [`Industry standards`, `Quality assurance`, `Continuous improvement`]
        ]
      },
      creative: {
        titles: [
          `🚀 Exploring ${topic}`,
          `✨ The Magic of ${topic}`,
          `🎯 ${topic} Revolution`,
          `💡 Innovative ${topic}`,
          `🌟 ${topic} Unleashed`
        ],
        contents: [
          [`Think outside the box`, `Embrace new possibilities`, `Challenge conventional wisdom`],
          [`Discover hidden potential`, `Unlock creative solutions`, `Transform your approach`],
          [`Revolutionary concepts`, `Game-changing strategies`, `Breakthrough innovations`],
          [`Fresh perspectives`, `Novel implementations`, `Creative problem-solving`],
          [`Limitless possibilities`, `Extraordinary results`, `Boundless creativity`]
        ]
      },
      minimal: {
        titles: [
          `${topic}`,
          `Key Insights`,
          `Implementation`,
          `Results`,
          `Next Steps`
        ],
        contents: [
          [`Essential concepts`, `Core principles`, `Fundamental approach`],
          [`Critical analysis`, `Key findings`, `Important metrics`],
          [`Simple execution`, `Clear methodology`, `Streamlined process`],
          [`Measurable outcomes`, `Performance indicators`, `Success metrics`],
          [`Action items`, `Future planning`, `Continuous improvement`]
        ]
      },
      academic: {
        titles: [
          `${topic}: Literature Review`,
          `Theoretical Framework`,
          `Methodology and Analysis`,
          `Findings and Discussion`,
          `Conclusions and Future Research`
        ],
        contents: [
          [`Previous research and studies`, `Theoretical foundations`, `Research gaps identified`],
          [`Conceptual models`, `Theoretical constructs`, `Framework development`],
          [`Research methodology`, `Data collection methods`, `Analytical approaches`],
          [`Empirical findings`, `Statistical analysis`, `Discussion of results`],
          [`Research contributions`, `Limitations and implications`, `Future research directions`]
        ]
      }
    }

    const template = templates[style as keyof typeof templates] || templates.professional
    const titleIndex = slideIndex % template.titles.length
    const contentIndex = slideIndex % template.contents.length

    return {
      title: template.titles[titleIndex],
      content: template.contents[contentIndex],
      notes: `This slide covers ${topic} with a ${style} approach. Consider adding visual elements to enhance understanding.`,
      suggestedElements: [
        {
          type: 'shape',
          content: 'Accent bar',
          position: { x: 50, y: 30 }
        },
        {
          type: 'shape',
          content: 'Visual divider',
          position: { x: 600, y: 100 }
        }
      ]
    }
  }

  // Provider management
  function updateProvider(providerName: string, updates: Partial<AIProvider>) {
    const provider = providers.value.find(p => p.name === providerName)
    if (provider) {
      Object.assign(provider, updates)

      // Save OpenRouter API key to localStorage
      if (providerName === 'OpenRouter' && updates.apiKey) {
        localStorage.setItem('openrouter_api_key', updates.apiKey)
      }
    }
  }

  function setDefaultProvider(providerName: string) {
    defaultProvider.value = providerName
  }

  // API key management
  function setAPIKey(providerName: string, apiKey: string) {
    updateProvider(providerName, { apiKey, enabled: !!apiKey })
  }

  function getEnabledProviders() {
    return providers.value.filter((p: AIProvider) => p.enabled)
  }

  // Check if API is configured
  function isConfigured(): boolean {
    const provider = providers.value.find(p => p.name === defaultProvider.value)
    return !!(provider?.enabled && provider?.apiKey)
  }

  return {
    // State
    isGenerating,
    providers,
    defaultProvider,

    // Core functions
    generateSlideContent,
    generateShapesFromContent,

    // Provider management
    updateProvider,
    setDefaultProvider,
    setAPIKey,
    getEnabledProviders,
    isConfigured
  }
} 
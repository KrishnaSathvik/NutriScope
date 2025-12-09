import { useState, useRef, useEffect } from 'react'
import { Plus, MessageSquare, Trash2, ChevronDown, X } from 'lucide-react'
import { ChatMessages } from '@/components/ChatMessages'
import { ChatInput } from '@/components/ChatInput'
import { useAuth } from '@/contexts/AuthContext'
import { ChatMessage, ChatConversation } from '@/types'
import { transcribeAudio } from '@/services/audio'
import { chatWithAI, executeAction } from '@/services/aiChat'
import { saveConversation, getConversation, getConversations, deleteConversation } from '@/services/chat'
import { uploadImage, analyzeMealImage } from '@/services/imageUpload'
import { getDailyLog } from '@/services/dailyLogs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useUserRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { logger } from '@/utils/logger'

export default function ChatPage() {
  const { profile, user, isGuest } = useAuth()
  const queryClient = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  // Set up realtime subscription for chat conversations
  useUserRealtimeSubscription('chat_conversations', ['conversations'], user?.id)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your NutriScope AI assistant. I can help you log meals, track workouts, answer nutrition questions, and provide personalized insights. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Get daily log for enhanced context
  const { data: dailyLog } = useQuery({
    queryKey: ['dailyLog', today],
    queryFn: () => getDailyLog(today),
    enabled: !!user || isGuest,
  })

  // Get all conversations for history
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => getConversations(user?.id || ''),
    enabled: !!user?.id,
  })


  // Load conversation when conversationId changes
  useEffect(() => {
    const loadConversation = async () => {
      if (conversationId && user?.id) {
        const conversation = await getConversation(user.id, conversationId)
        if (conversation && conversation.messages.length > 0) {
          setMessages(conversation.messages)
        }
      } else if (!conversationId) {
        // Reset to initial message for new chat
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm your NutriScope AI assistant. I can help you log meals, track workouts, answer nutrition questions, and provide personalized insights. How can I help you today?",
            timestamp: new Date().toISOString(),
          },
        ])
      }
    }
    loadConversation()
  }, [conversationId, user])

  // Handle new chat
  const handleNewChat = () => {
    setConversationId(null)
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: "Hi! I'm your NutriScope AI assistant. I can help you log meals, track workouts, answer nutrition questions, and provide personalized insights. How can I help you today?",
        timestamp: new Date().toISOString(),
      },
    ])
    setInput('')
    setSelectedImage(null)
    setShowHistory(false)
  }

  // Handle conversation selection
  const handleSelectConversation = async (id: string) => {
    if (id === conversationId) return
    setConversationId(id)
    setShowHistory(false)
  }

  // Handle delete conversation
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user?.id) return
    if (confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation(user.id, id)
      refetchConversations()
      if (id === conversationId) {
        handleNewChat()
      }
    }
  }

  // Get conversation title from first user message
  const getConversationTitle = (conversation: ChatConversation): string => {
    if (conversation.title) return conversation.title
    const firstUserMessage = conversation.messages.find(m => m.role === 'user')
    if (firstUserMessage) {
      const content = firstUserMessage.content.substring(0, 50)
      return content.length < firstUserMessage.content.length ? content + '...' : content
    }
    return 'New Chat'
  }

  // Save conversation when messages change
  useEffect(() => {
    const saveConversationDebounced = async () => {
      if (messages.length > 1 && user?.id) {
        const id = await saveConversation(user.id, messages, conversationId || undefined)
        if (!conversationId) {
          setConversationId(id)
        }
        // Refresh conversations list
        refetchConversations()
      }
    }
    
    const timeoutId = setTimeout(saveConversationDebounced, 1000)
    return () => clearTimeout(timeoutId)
  }, [messages, conversationId, user, isGuest, refetchConversations])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
        setIsRecording(false)
        setIsTranscribing(true)

        try {
          const transcribedText = await transcribeAudio(audioBlob, user?.id)
          setInput(transcribedText)
          setIsTranscribing(false)
        } catch (error) {
          console.error('Transcription error:', error)
          setIsTranscribing(false)
          const errorMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: error instanceof Error ? error.message : 'Failed to transcribe audio. Please try again.',
            timestamp: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, errorMessage])
        } finally {
          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      setIsRecording(false)
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Could not access microphone. Please check your permissions and try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }

  const handleImageSelect = async (file: File) => {
    setUploadingImage(true)
    try {
      if (!user?.id) {
        throw new Error('Not authenticated')
      }
      const imageUrl = await uploadImage(user.id, file, 'chat')
      if (imageUrl) {
        setSelectedImage(imageUrl)
        
        // Analyze image for meal recognition
        try {
          const analysis = await analyzeMealImage(imageUrl)
          if (analysis.description) {
            setInput(prev => prev ? `${prev} ${analysis.description}` : analysis.description)
            
            // If nutrition data available, add to input
            if (analysis.estimatedNutrition) {
              const nutrition = analysis.estimatedNutrition
              const nutritionText = `Estimated nutrition: ${nutrition.calories || 0} calories, ${nutrition.protein || 0}g protein${nutrition.carbs ? `, ${nutrition.carbs}g carbs` : ''}${nutrition.fats ? `, ${nutrition.fats}g fats` : ''}`
              setInput(prev => prev ? `${prev}. ${nutritionText}` : nutritionText)
            }
          }
        } catch (e) {
          console.error('Error analyzing image:', e)
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setUploadingImage(false)
    }
  }

  // Handle action confirmation
  const handleConfirmAction = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message || !message.action || !user?.id) return

    // Mark message as confirmed
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, confirmed: true, requires_confirmation: false } : m
      )
    )

    try {
      // If confirming a generate_recipe action, convert it to save_recipe
      let actionToExecute = message.action!
      if (actionToExecute.type === 'generate_recipe' && actionToExecute.data?.recipe) {
        actionToExecute = {
          type: 'save_recipe',
          data: {
            recipe: actionToExecute.data.recipe,
          },
          requires_confirmation: false,
        }
      }
      
      // Execute the action
      const actionResult = await executeAction(actionToExecute, user.id, today)

      if (actionResult.success) {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['meals'] })
        queryClient.invalidateQueries({ queryKey: ['exercises'] })
        queryClient.invalidateQueries({ queryKey: ['waterIntake'] })
        queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
        // Force refetch recipes immediately after saving
        queryClient.invalidateQueries({ queryKey: ['recipes'] })
        queryClient.refetchQueries({ queryKey: ['recipes'] })
        queryClient.invalidateQueries({ queryKey: ['mealPlans'] })
        queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
        queryClient.invalidateQueries({ queryKey: ['streak'] }) // Update streak when actions are executed

        // Don't add another message when user confirms - the AI already responded
        // The action execution happens silently in the background
      } else {
        // Show error message
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: actionResult.message || 'Failed to execute action. Please try again.',
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Error executing action:', error)
      logger.error('Error executing action:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  // Handle action cancellation
  const handleCancelAction = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, confirmed: false, requires_confirmation: false } : m
      )
    )

    // Add cancellation message
    const cancelMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'No problem! Let me know if you need anything else.',
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, cancelMessage])
  }

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || loading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image_url: selectedImage || undefined,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setSelectedImage(null)
    setLoading(true)

    try {
      if (!user?.id) {
        throw new Error('Not authenticated')
      }
      
      // Use AI chat service with enhanced context
      const response = await chatWithAI(
        [...messages, userMessage],
        profile,
        dailyLog || null,
        selectedImage || undefined,
        user?.id
      )

      // Animate message typing effect with variable speed
      setIsStreaming(true)
      setStreamingMessage('')
      
      const messageId = (Date.now() + 1).toString()
      const fullMessage = response.message
      let currentIndex = 0
      
      // Variable typing speed for more natural feel
      const getTypingSpeed = (char: string) => {
        if (char === ' ') return 5
        if (char === '.' || char === '!' || char === '?') return 30
        if (char === ',' || char === ';') return 20
        if (char === '\n') return 15
        return 10
      }
      
      const typeNextChar = () => {
        if (currentIndex < fullMessage.length) {
          const char = fullMessage[currentIndex]
          setStreamingMessage(fullMessage.substring(0, currentIndex + 1))
          currentIndex++
          
          setTimeout(typeNextChar, getTypingSpeed(char))
        } else {
          setIsStreaming(false)
          
          // Add complete message to chat with action if present
          const assistantMessage: ChatMessage = {
            id: messageId,
            role: 'assistant',
            content: fullMessage,
            timestamp: new Date().toISOString(),
            action: response.action,
            requires_confirmation: response.action?.requires_confirmation || false,
          }
          
          setMessages((prev) => [...prev, assistantMessage])
          setStreamingMessage('')

          // Execute action immediately if it doesn't require confirmation
          if (response.action && response.action.type !== 'none' && !response.action.requires_confirmation && user?.id) {
            // Execute action asynchronously
            executeAction(response.action, user.id, today)
              .then((actionResult) => {
                if (actionResult.success) {
                  // Invalidate queries to refresh data
                  queryClient.invalidateQueries({ queryKey: ['meals'] })
                  queryClient.invalidateQueries({ queryKey: ['exercises'] })
                  queryClient.invalidateQueries({ queryKey: ['waterIntake'] })
                  queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
                  // Force refetch recipes immediately after saving
                  queryClient.invalidateQueries({ queryKey: ['recipes'] })
                  queryClient.refetchQueries({ queryKey: ['recipes'] })
                  queryClient.invalidateQueries({ queryKey: ['mealPlans'] })
                  queryClient.invalidateQueries({ queryKey: ['groceryLists'] })
                  queryClient.invalidateQueries({ queryKey: ['streak'] }) // Update streak when actions are executed
                  
                  // Add confirmation message
                  const confirmationMessage: ChatMessage = {
                    id: (Date.now() + 2).toString(),
                    role: 'assistant',
                    content: actionResult.message,
                    timestamp: new Date().toISOString(),
                  }
                  setMessages((prev) => [...prev, confirmationMessage])
                }
              })
              .catch((actionError) => {
                console.error('Error executing action:', actionError)
                const errorMessage: ChatMessage = {
                  id: (Date.now() + 2).toString(),
                  role: 'assistant',
                  content: 'I understood what you wanted to log, but encountered an error. Please try logging it manually.',
                  timestamp: new Date().toISOString(),
                }
                setMessages((prev) => [...prev, errorMessage])
              })
          }
        }
      }
      
      // Start typing animation after a brief delay
      setTimeout(typeNextChar, 100)
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 py-4 md:py-6 pb-20 md:pb-6 space-y-4 md:space-y-8">
      <div className="border-b border-border pb-4 md:pb-6 relative z-40 sticky top-0 md:static">
        <div>
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <div className="h-px w-6 md:w-8 bg-acid"></div>
            <span className="text-[10px] md:text-xs text-dim font-mono uppercase tracking-widest">AI Assistant</span>
          </div>
          <div className="flex items-center justify-between mt-2 md:mt-4">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text tracking-tighter">Chat</h1>
            <div className="flex items-center gap-2 relative z-50">
              {/* New Chat Button */}
              <button
                onClick={handleNewChat}
                className="btn-secondary gap-1.5 md:gap-2 text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2"
                title="New Chat"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">New Chat</span>
              </button>

              {/* Chat History Button - Mobile */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                  className="btn-secondary gap-1.5 md:gap-2 text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 md:hidden"
                title="Chat History"
              >
                <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>

              {/* Chat History Dropdown - Desktop */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="btn-secondary gap-1.5 md:gap-2 text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2"
                  title="Chat History"
                >
                  <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">History</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {showHistory && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowHistory(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-sm shadow-lg z-50 max-h-[60vh] overflow-hidden flex flex-col">
                      <div className="p-3 md:p-4 border-b border-border flex-shrink-0">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-wider font-mono">Chat History</h2>
                          <button
                            onClick={() => setShowHistory(false)}
                            className="text-dim hover:text-text"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="overflow-y-auto scrollbar-hide flex-1">
                        {conversations.length === 0 ? (
                          <div className="p-4 text-center">
                            <p className="text-xs text-dim font-mono">No previous chats</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-border">
                            {conversations.map((conversation) => (
                              <div
                                key={conversation.id}
                                onClick={() => handleSelectConversation(conversation.id)}
                                className={`p-3 md:p-4 cursor-pointer hover:bg-panel/50 transition-colors group ${
                                  conversationId === conversation.id ? 'bg-panel border-l-2 border-acid' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <MessageSquare className="w-3.5 h-3.5 text-acid flex-shrink-0" />
                                      <p className="text-xs md:text-sm font-mono text-text truncate">
                                        {getConversationTitle(conversation)}
                                      </p>
                                    </div>
                                    <p className="text-[10px] md:text-xs text-dim font-mono">
                                      {format(new Date(conversation.updated_at), 'MMM d, h:mm a')}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => handleDeleteConversation(conversation.id, e)}
                                    className="opacity-0 group-hover:opacity-100 text-dim hover:text-error transition-opacity p-1"
                                    title="Delete conversation"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile History Sidebar */}
      {showHistory && (
        <>
          <div
            className="fixed inset-0 bg-void/80 z-40 md:hidden"
            onClick={() => setShowHistory(false)}
          />
          <div className="fixed left-0 top-0 h-full w-64 z-50 md:hidden bg-surface border-r border-border">
            <div className="p-3 md:p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xs md:text-sm font-bold text-text uppercase tracking-wider font-mono">Chat History</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-dim hover:text-text"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto scrollbar-hide h-[calc(100vh-12rem)]">
              {conversations.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-dim font-mono">No previous chats</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={`p-3 md:p-4 cursor-pointer hover:bg-panel/50 transition-colors group ${
                        conversationId === conversation.id ? 'bg-panel border-l-2 border-acid' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-3.5 h-3.5 text-acid flex-shrink-0" />
                            <p className="text-xs md:text-sm font-mono text-text truncate">
                              {getConversationTitle(conversation)}
                            </p>
                          </div>
                          <p className="text-[10px] md:text-xs text-dim font-mono">
                            {format(new Date(conversation.updated_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteConversation(conversation.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-dim hover:text-error transition-opacity p-1"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="chat-container flex flex-col fixed md:relative inset-x-0 top-[10rem] md:top-auto bottom-[4rem] md:bottom-auto bg-surface border-x-0 md:border-x border-t-0 md:border-t border-b border-border md:rounded-sm overflow-hidden z-30" style={{ 
        height: 'calc(100vh - 14rem)', 
        maxHeight: 'calc(100vh - 14rem)',
        minHeight: 0
      }}>
        <ChatMessages
          messages={messages}
          loading={loading}
          isStreaming={isStreaming}
          streamingMessage={streamingMessage}
          onConfirmAction={handleConfirmAction}
          onCancelAction={handleCancelAction}
        />
        <ChatInput
          input={input}
          setInput={setInput}
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
          loading={loading}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          uploadingImage={uploadingImage}
          onSend={handleSend}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onImageSelect={handleImageSelect}
        />
      </div>
    </div>
  )
}

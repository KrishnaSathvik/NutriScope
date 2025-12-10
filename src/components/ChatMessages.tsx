import { useEffect, useRef } from 'react'
import { Bot, User, Check, X } from 'lucide-react'
import { ChatMessage } from '@/types'
import { stripMarkdown, stripLatex } from '@/utils/format'

interface ChatMessagesProps {
  messages: ChatMessage[]
  loading: boolean
  isStreaming: boolean
  streamingMessage: string
  onConfirmAction?: (messageId: string) => void
  onCancelAction?: (messageId: string) => void
  onPromptClick?: (prompt: string) => void
}

export function ChatMessages({ messages, loading, isStreaming, streamingMessage, onConfirmAction, onCancelAction, onPromptClick }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-3 md:p-6 space-y-3 md:space-y-4" style={{ minHeight: 0 }}>
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`flex items-start gap-2 md:gap-3 animate-slide-up ${
            message.role === 'user' ? 'flex-row-reverse' : ''
          }`}
          style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
        >
          <div
            className={`flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
              message.role === 'user' 
                ? 'bg-accent-soft text-acid hover:scale-110' 
                : 'bg-icon-soft border border-border/40 hover:border-accent/50'
            }`}
          >
            {message.role === 'user' ? (
              <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
            ) : (
              <Bot className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid animate-pulse-slow" />
            )}
          </div>
          <div
            className={`flex-1 min-w-0 rounded-2xl p-3 md:p-4 border transition-all duration-300 ${
              message.role === 'user'
                ? 'bg-accent-soft border-accent/40 text-acid font-medium hover:bg-accent-soft/90 ml-auto'
                : 'bg-panel border-border/40 text-text hover:border-accent/30 shadow-inner'
            }`}
          >
            <p className={`whitespace-pre-wrap text-sm md:text-base font-medium font-mono leading-relaxed animate-fade-in break-words ${
              message.role === 'user' ? 'text-acid font-semibold' : 'text-text'
            }`}>
              {message.role === 'assistant' 
                ? stripLatex(stripMarkdown(message.content))
                : message.content}
            </p>
            
            {/* Suggested Prompts - Show only after first assistant message */}
            {message.role === 'assistant' && 
             index === 0 && 
             messages.length === 1 && 
             !loading && 
             !isStreaming && 
             onPromptClick && (
              <div className="mt-4 space-y-2">
                <div className="text-xs md:text-sm text-text font-medium font-mono uppercase tracking-wider mb-2">Try asking:</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      text: "How should I improve today's macros?",
                      // Light theme: darker green, Dark theme: neon green
                      className: "bg-[rgba(20,184,166,0.1)] dark:bg-[rgba(196,255,71,0.1)] border-[rgba(20,184,166,0.4)] dark:border-[rgba(196,255,71,0.4)] text-[#0d9488] dark:text-[#c4ff47] font-semibold hover:bg-[rgba(20,184,166,0.15)] dark:hover:bg-[rgba(196,255,71,0.15)] hover:border-[rgba(20,184,166,0.6)] dark:hover:border-[rgba(196,255,71,0.6)]",
                    },
                    {
                      text: "Create a 3-day meal plan under 2000 kcal",
                      // Green - darker for light mode
                      className: "bg-[rgba(34,197,94,0.1)] dark:bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.4)] dark:border-[rgba(34,197,94,0.4)] text-[#0d7a3a] dark:text-[#22c55e] hover:bg-[rgba(34,197,94,0.15)] hover:border-[rgba(34,197,94,0.6)]",
                    },
                    {
                      text: "Rate my last workout & suggest changes",
                      // Orange - darker for light mode
                      className: "bg-[rgba(249,115,22,0.1)] dark:bg-[rgba(249,115,22,0.1)] border-[rgba(249,115,22,0.4)] dark:border-[rgba(249,115,22,0.4)] text-[#c2410c] dark:text-[#f97316] hover:bg-[rgba(249,115,22,0.15)] hover:border-[rgba(249,115,22,0.6)]",
                    },
                    {
                      text: "What should I eat for lunch today?",
                      // Blue - darker for light mode
                      className: "bg-[rgba(59,130,246,0.1)] dark:bg-[rgba(147,197,253,0.1)] border-[rgba(59,130,246,0.4)] dark:border-[rgba(147,197,253,0.4)] text-[#1e40af] dark:text-[#93c5fd] hover:bg-[rgba(59,130,246,0.15)] dark:hover:bg-[rgba(147,197,253,0.15)] hover:border-[rgba(59,130,246,0.6)] dark:hover:border-[rgba(147,197,253,0.6)]",
                    },
                  ].map((prompt) => (
                    <button
                      key={prompt.text}
                      onClick={() => onPromptClick(prompt.text)}
                      className={`px-3 py-1.5 text-xs md:text-sm font-medium font-mono border rounded-sm transition-all duration-200 active:scale-95 ${prompt.className}`}
                    >
                      {prompt.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {message.image_url && (
              <img
                src={message.image_url}
                alt="User upload"
                className="mt-2 md:mt-3 max-w-full md:max-w-[300px] rounded-sm border border-border animate-slide-up"
                style={{ animationDelay: '100ms' }}
              />
            )}
            
            {/* Confirmation Buttons with Severity Styling */}
            {message.role === 'assistant' && message.requires_confirmation && !message.confirmed && message.action && (
              <div className={`mt-3 md:mt-4 space-y-2 animate-slide-up ${message.action.severity === 'destructive' ? 'p-3 md:p-4 bg-error/10 border border-error/30 rounded-sm' : message.action.severity === 'warning' ? 'p-3 md:p-4 bg-warning/10 border border-warning/30 rounded-sm' : ''}`} style={{ animationDelay: '200ms' }}>
                {message.action.severity === 'destructive' && (
                  <div className="text-xs md:text-sm text-error font-medium font-mono mb-2">
                    ⚠️ This action cannot be undone
                  </div>
                )}
                {message.action.severity === 'warning' && (
                  <div className="text-xs md:text-sm text-warning font-medium font-mono mb-2">
                    ⚠️ Please review before confirming
                  </div>
                )}
                <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={() => onConfirmAction?.(message.id)}
                    className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-sm transition-all duration-200 hover:scale-105 active:scale-95 text-xs md:text-sm font-medium font-mono ${
                      message.action.severity === 'destructive'
                        ? 'bg-error/20 hover:bg-error/30 border border-error/50 text-error'
                        : message.action.severity === 'warning'
                        ? 'bg-warning/20 hover:bg-warning/30 border border-warning/50 text-warning'
                        : 'bg-success/20 hover:bg-success/30 border border-success/50 text-success'
                    }`}
                >
                  <Check className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span>Yes</span>
                </button>
                <button
                  onClick={() => onCancelAction?.(message.id)}
                    className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-panel hover:bg-border border border-border text-text hover:text-acid rounded-sm transition-all duration-200 hover:scale-105 active:scale-95 text-xs md:text-sm font-medium font-mono"
                >
                  <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span>No</span>
                </button>
                </div>
              </div>
            )}
            
            {/* Confirmed Status */}
            {message.role === 'assistant' && message.confirmed && (
              <div className="mt-2 md:mt-3 flex items-center gap-1.5 text-xs md:text-sm text-success font-medium font-mono animate-fade-in">
                <Check className="w-3 h-3" />
                <span>Confirmed</span>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {/* Loading Indicator */}
      {loading && !isStreaming && (
        <div className="flex items-start gap-2 md:gap-3 animate-slide-up">
          <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-sm bg-panel border border-border flex items-center justify-center relative">
            <Bot className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid animate-pulse-slow" />
            <div className="absolute inset-0 rounded-sm border-2 border-acid/30 animate-ping" />
          </div>
          <div className="flex-1 rounded-2xl p-3 md:p-4 bg-panel border border-border/40 shadow-inner">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-acid rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }} />
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-acid rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }} />
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-acid rounded-full animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '0.6s' }} />
              </div>
              <span className="text-xs md:text-sm text-text font-medium font-mono animate-pulse">AI is thinking...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Streaming Message Animation */}
      {isStreaming && streamingMessage && (
        <div className="flex items-start gap-2 md:gap-3 animate-slide-up">
          <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-sm bg-panel border border-acid/30 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid animate-pulse-slow" />
          </div>
          <div className="flex-1 min-w-0 rounded-2xl p-3 md:p-4 bg-panel border border-border/40 shadow-inner">
            <p className="whitespace-pre-wrap text-sm md:text-base font-medium font-mono leading-relaxed text-text break-words">
              {stripLatex(stripMarkdown(streamingMessage))}
              <span className="inline-block w-0.5 h-3 md:h-4 bg-acid ml-1 animate-blink align-middle" />
            </p>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}


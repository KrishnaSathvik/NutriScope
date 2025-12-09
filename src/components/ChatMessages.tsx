import { useEffect, useRef } from 'react'
import { Bot, User } from 'lucide-react'
import { ChatMessage } from '@/types'

interface ChatMessagesProps {
  messages: ChatMessage[]
  loading: boolean
  isStreaming: boolean
  streamingMessage: string
}

export function ChatMessages({ messages, loading, isStreaming, streamingMessage }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4 pb-20 md:pb-6">
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`flex items-start gap-2 md:gap-3 animate-slide-up ${
            message.role === 'user' ? 'flex-row-reverse' : ''
          }`}
          style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
        >
          <div
            className={`flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-sm flex items-center justify-center border transition-all duration-300 ${
              message.role === 'user' 
                ? 'bg-acid text-void border-acid hover:scale-110' 
                : 'bg-panel border-border hover:border-acid/50'
            }`}
          >
            {message.role === 'user' ? (
              <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
            ) : (
              <Bot className="w-3.5 h-3.5 md:w-4 md:h-4 text-acid animate-pulse-slow" />
            )}
          </div>
          <div
            className={`flex-1 min-w-0 rounded-sm p-3 md:p-4 border transition-all duration-300 ${
              message.role === 'user'
                ? 'bg-acid/20 border-acid/30 text-text hover:bg-acid/25'
                : 'bg-panel border-border text-text hover:border-acid/30'
            }`}
          >
            <p className="whitespace-pre-wrap text-xs md:text-sm font-mono leading-relaxed animate-fade-in break-words">{message.content}</p>
            {message.image_url && (
              <img
                src={message.image_url}
                alt="User upload"
                className="mt-2 md:mt-3 max-w-full md:max-w-[300px] rounded-sm border border-border animate-slide-up"
                style={{ animationDelay: '100ms' }}
              />
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
          <div className="flex-1 rounded-sm p-3 md:p-4 bg-panel border border-border">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-acid rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }} />
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-acid rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }} />
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-acid rounded-full animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '0.6s' }} />
              </div>
              <span className="text-[10px] md:text-xs text-dim font-mono animate-pulse">AI is thinking...</span>
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
          <div className="flex-1 min-w-0 rounded-sm p-3 md:p-4 bg-panel border border-border">
            <p className="whitespace-pre-wrap text-xs md:text-sm font-mono leading-relaxed text-text break-words">
              {streamingMessage}
              <span className="inline-block w-0.5 h-3 md:h-4 bg-acid ml-1 animate-blink align-middle" />
            </p>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}


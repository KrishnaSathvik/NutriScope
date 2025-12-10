import { useRef } from 'react'
import { Send, Mic, MicOff, Loader2, Image as ImageIcon, X } from 'lucide-react'

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  selectedImage: string | null
  setSelectedImage: (value: string | null) => void
  loading: boolean
  isRecording: boolean
  isTranscribing: boolean
  uploadingImage: boolean
  onSend: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onImageSelect: (file: File) => void
}

export function ChatInput({
  input,
  setInput,
  selectedImage,
  setSelectedImage,
  loading,
  isRecording,
  isTranscribing,
  uploadingImage,
  onSend,
  onStartRecording,
  onStopRecording,
  onImageSelect,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="border-t border-border p-3 md:p-4 bg-panel flex-shrink-0">
      {selectedImage && (
        <div className="relative mb-3 w-24 h-24 md:w-32 md:h-32 rounded-sm overflow-hidden border border-border">
          <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-1 right-1 bg-void/50 text-text rounded-full p-1 hover:bg-void/70 transition-colors"
            title="Remove image"
            aria-label="Remove image"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSend()
        }}
        className="flex gap-1.5 md:gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 input-modern bg-surface text-[16px] md:text-base"
          disabled={loading || isRecording || isTranscribing || uploadingImage}
          aria-label="Chat message input"
          aria-describedby={loading ? "chat-loading" : isRecording ? "chat-recording" : undefined}
        />
        <div className="flex gap-1.5 md:gap-2">
          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || isRecording || isTranscribing || uploadingImage}
            className="btn-secondary px-2.5 md:px-4 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            title="Upload image"
            aria-label="Upload image"
          >
            {uploadingImage ? (
              <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin text-acid" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
            )}
          </button>
          {/* Voice Recording Button */}
          {!isRecording ? (
            <button
              type="button"
              aria-label="Start voice recording"
              onClick={onStartRecording}
              disabled={loading || isTranscribing || uploadingImage}
              className="btn-secondary px-2.5 md:px-4 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              title="Start voice recording"
            >
              {isTranscribing ? (
                <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin text-acid" />
              ) : (
                <Mic className="w-3.5 h-3.5 md:w-4 md:h-4" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopRecording}
              className="btn-primary px-2.5 md:px-4 bg-error hover:bg-error/80 border-error active:scale-95"
              title="Stop recording"
              aria-label="Stop voice recording"
            >
              <MicOff className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          )}
          {/* Send Button */}
          <button
            type="submit"
            disabled={loading || (!input.trim() && !selectedImage) || isRecording || isTranscribing || uploadingImage}
            className="btn-primary gap-1 md:gap-2 px-3 md:px-4 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            aria-label="Send message"
          >
            <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onImageSelect(e.target.files[0])
            }
          }}
          disabled={loading || isRecording || isTranscribing || uploadingImage}
        />
      </form>
      {/* Recording Indicator */}
      {isRecording && (
        <div className="mt-2 flex items-center gap-2 text-[10px] md:text-xs text-error font-mono">
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-error rounded-full animate-pulse"></div>
          <span>Recording... Tap to stop</span>
        </div>
      )}
      {isTranscribing && (
        <div className="mt-2 flex items-center gap-2 text-[10px] md:text-xs text-acid font-mono">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Transcribing audio...</span>
        </div>
      )}
      {uploadingImage && (
        <div className="mt-2 flex items-center gap-2 text-[10px] md:text-xs text-acid font-mono">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Uploading and analyzing image...</span>
        </div>
      )}
    </div>
  )
}


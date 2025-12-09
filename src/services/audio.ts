import { openai } from "@/lib/openai"
import { logger } from '@/utils/logger'

/**
 * Transcribe audio using backend API proxy or OpenAI Whisper API directly
 * Whisper API accepts: mp3, mp4, mpeg, mpga, m4a, wav, webm
 */
export async function transcribeAudio(audioBlob: Blob, userId?: string): Promise<string> {
  // Use backend API proxy if available
  const useBackendProxy = import.meta.env.VITE_USE_BACKEND_PROXY !== 'false'
  
  if (useBackendProxy) {
    try {
      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob)
      
      const apiUrl = import.meta.env.VITE_API_URL?.replace('/chat', '/transcribe') || '/api/transcribe'
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId && { 'x-user-id': userId }),
        },
        body: JSON.stringify({
          audio: base64Audio,
          userId,
        }),
      })

      if (!response.ok) {
        if (response.status === 429) {
          const error = await response.json()
          throw new Error(error.message || 'Rate limit exceeded. Please try again later.')
        }
        const error = await response.json()
        throw new Error(error.error || 'Failed to transcribe audio')
      }

      const data = await response.json()
      return data.text
    } catch (error) {
      // In production, always use backend proxy - no fallback
      if (import.meta.env.PROD) {
        logger.error('Backend proxy failed in production:', error)
        throw new Error('Transcription service unavailable. Please try again later.')
      }
      // Fall back to direct OpenAI only in development
      logger.warn('Backend proxy failed, falling back to direct OpenAI:', error)
      return transcribeAudioDirect(audioBlob)
    }
  }

  // Direct OpenAI call (dev only - should not reach here in production)
  if (import.meta.env.PROD) {
    throw new Error('Backend proxy is required in production. Please set VITE_USE_BACKEND_PROXY=true')
  }
  return transcribeAudioDirect(audioBlob)
}

/**
 * Convert blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Direct OpenAI transcription (dev/fallback only)
 * @deprecated Use backend proxy in production
 */
async function transcribeAudioDirect(audioBlob: Blob): Promise<string> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  // Validate audio blob
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error("No audio data recorded. Please try recording again.");
  }

  // Check minimum size (very short recordings might fail)
  // Increased threshold to ensure there's actual audio content
  const MIN_SIZE_BYTES = 1000; // ~1KB minimum for meaningful audio
  if (audioBlob.size < MIN_SIZE_BYTES) {
    throw new Error("Recording too short. Please speak for at least 2-3 seconds.");
  }

  try {
    // Determine file extension based on blob type
    let fileExtension = "webm";
    let mimeType = audioBlob.type || "audio/webm";
    
    // Map MIME types to file extensions for Whisper API
    // Whisper prefers: mp3, wav, m4a, webm (in that order for compatibility)
    if (mimeType.includes("mp3") || mimeType.includes("mpeg")) {
      fileExtension = "mp3";
    } else if (mimeType.includes("wav")) {
      fileExtension = "wav";
    } else if (mimeType.includes("mp4") || mimeType.includes("m4a")) {
      fileExtension = "m4a";
    } else if (mimeType.includes("webm")) {
      fileExtension = "webm";
    }

    // Create File object with proper extension
    const audioFile = new File([audioBlob], `audio.${fileExtension}`, { 
      type: mimeType
    });

    logger.debug("Transcribing audio:", {
      size: audioBlob.size,
      type: mimeType,
      extension: fileExtension,
      sizeKB: (audioBlob.size / 1024).toFixed(2)
    });

    // Try transcription - don't specify language to let Whisper auto-detect
    // This can help with better speech detection
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "text",
      // Removed language parameter - let Whisper auto-detect for better results
    });

    // When response_format is "text", OpenAI returns a string directly
    // When it's "json", it returns an object with a "text" property
    let transcribedText = "";
    if (typeof transcription === "string") {
      transcribedText = transcription;
    } else if (transcription && typeof transcription === "object") {
      // Handle JSON response format (if response_format was "json")
      const response = transcription as any;
      transcribedText = response.text || response.transcript || String(response || "").trim();
    } else {
      transcribedText = String(transcription || "").trim();
    }
    
    logger.debug("Whisper API response:", {
      responseType: typeof transcription,
      responseKeys: transcription && typeof transcription === "object" ? Object.keys(transcription) : [],
      transcribedLength: transcribedText.length,
      preview: transcribedText.substring(0, 100),
      fullResponse: transcription
    });
    
    // Check if transcription is empty or only contains whitespace/punctuation
    const trimmedText = transcribedText.trim();
    if (!trimmedText || trimmedText.length === 0) {
      logger.warn("Whisper returned empty transcription. Possible causes:");
      logger.warn("- Audio too quiet or contains only silence");
      logger.warn("- Audio format compatibility issue");
      logger.warn("- Recording too short or no speech detected");
      logger.debug("Audio details:", {
        size: audioBlob.size,
        type: mimeType,
        extension: fileExtension
      });
      throw new Error("No speech detected. Please speak clearly for at least 2-3 seconds and try again.");
    }

    logger.debug("Transcription successful:", transcribedText);
    return trimmedText;
  } catch (error: unknown) {
    logger.error("Error transcribing audio:", error);
    
    // More detailed error message
    const errorObj = error as { message?: string; status?: number; response?: any };
    
    // If this is already our custom error, re-throw it
    if (errorObj.message?.includes("No speech detected") || 
        errorObj.message?.includes("Recording too short") ||
        errorObj.message?.includes("No audio data")) {
      throw error;
    }
    
    // Check for specific error types from OpenAI API
    if (errorObj.message?.includes("Invalid file format") || errorObj.message?.includes("file format")) {
      throw new Error("Audio format not supported. Please try recording again.");
    }
    if (errorObj.status === 401) {
      throw new Error("Invalid API key. Please check your OpenAI API key.");
    }
    if (errorObj.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }
    
    // Check for OpenAI API errors that indicate no speech
    const errorMessage = errorObj.message || "";
    if (errorMessage.toLowerCase().includes("empty") || 
        errorMessage.toLowerCase().includes("no speech") ||
        errorMessage.toLowerCase().includes("silence")) {
      throw new Error("No speech detected. Please speak clearly for at least 2-3 seconds and try again.");
    }
    
    // Log full error for debugging
    logger.error("Full error details:", errorObj);
    
    throw new Error(errorObj.message || "Failed to transcribe audio. Please try again.");
  }
}


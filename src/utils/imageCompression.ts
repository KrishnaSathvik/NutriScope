/**
 * Image compression utility
 * Compresses images before upload to reduce file size
 */

interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxSizeKB?: number
}

/**
 * Compress an image file
 * @param file - Original image file
 * @param options - Compression options
 * @returns Compressed File or original file if compression fails
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    maxSizeKB = 500,
  } = options

  // Check if file is already small enough
  if (file.size <= maxSizeKB * 1024) {
    return file
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width
        let height = img.height
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }
        
        // Create canvas and compress
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file) // Fallback to original
          return
        }
        
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file) // Fallback to original
              return
            }
            
            // Check if compressed size is acceptable
            if (blob.size <= maxSizeKB * 1024 || blob.size >= file.size) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              // Try with lower quality if still too large
              canvas.toBlob(
                (lowerQualityBlob) => {
                  if (!lowerQualityBlob) {
                    resolve(file)
                    return
                  }
                  const compressedFile = new File([lowerQualityBlob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                  })
                  resolve(compressedFile)
                },
                file.type,
                quality * 0.7 // Lower quality
              )
            }
          },
          file.type,
          quality
        )
      }
      
      img.onerror = () => {
        resolve(file) // Fallback to original on error
      }
      
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => {
      resolve(file) // Fallback to original on error
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Get optimal compression options based on use case
 */
export function getCompressionOptions(
  useCase: 'chat' | 'recipe' | 'profile'
): CompressionOptions {
  switch (useCase) {
    case 'chat':
      return {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.75,
        maxSizeKB: 300,
      }
    case 'recipe':
      return {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeKB: 500,
      }
    case 'profile':
      return {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.9,
        maxSizeKB: 200,
      }
    default:
      return {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8,
        maxSizeKB: 500,
      }
  }
}


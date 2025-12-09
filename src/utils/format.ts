/**
 * Format optional nutrition values
 * Returns "-" if value is null, undefined, or 0
 * Otherwise returns formatted value with unit
 */
export function formatOptionalNutrition(value: number | null | undefined, unit: string = 'g'): string {
  if (value === null || value === undefined || value === 0) {
    return '-'
  }
  return `${value}${unit}`
}

/**
 * Format optional number value
 * Returns "-" if value is null, undefined, or 0
 * Otherwise returns formatted number
 */
export function formatOptionalNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return '-'
  }
  return value.toString()
}

/**
 * Strip markdown formatting from text
 * Removes **bold**, *italic*, `code`, # headers, etc.
 */
export function stripMarkdown(text: string): string {
  if (!text) return text
  
  return text
    // Remove bold (**text** or __text__)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic (*text* or _text_)
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove code blocks (`code` or ```code```)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove headers (# Header)
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    // Remove links [text](url)
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
    // Remove horizontal rules (--- or ***)
    .replace(/^[-*]{3,}$/gm, '')
    // Remove list markers (- item or * item or 1. item)
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}


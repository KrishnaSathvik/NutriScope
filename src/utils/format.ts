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
 * Strip JSON objects from text
 * Removes JSON objects that might be accidentally included in AI responses
 */
export function stripJSON(text: string): string {
  if (!text) return text
  
  // Remove JSON objects (including multiline)
  let cleaned = text
    // Remove complete JSON objects with action field
    .replace(/\{[\s\S]*?"action"[\s\S]*?\}/g, '')
    // Remove any remaining JSON-like structures
    .replace(/\{[\s\S]*?\}/g, (match) => {
      // Only remove if it looks like JSON (has quotes, colons, etc.)
      if (match.includes('"') && match.includes(':')) {
        return ''
      }
      return match
    })
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  
  return cleaned
}

/**
 * Strip LaTeX formatting from text
 * Removes LaTeX math delimiters like \[ ... \], \( ... \), \text{}, \frac{}, etc.
 */
export function stripLatex(text: string): string {
  if (!text) return text
  
  return text
    // Remove display math blocks \[ ... \]
    .replace(/\\\[(?:[\s\S]*?)\\\]/g, '')
    // Remove inline math blocks \( ... \)
    .replace(/\\\((?:[\s\S]*?)\\\)/g, '')
    // Convert \text{Something} -> "Something"
    .replace(/\\text\{([^}]*)\}/g, '$1')
    // Convert \frac{a}{b} -> a / b
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1 / $2')
    // Remove other LaTeX commands like \textbf{}, \emph{}, etc. (keep content)
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Strip markdown formatting from text
 * Removes **bold**, *italic*, `code`, # headers, etc.
 */
export function stripMarkdown(text: string): string {
  if (!text) return text
  
  // First strip JSON, then markdown
  let cleaned = stripJSON(text)
  
  return cleaned
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

/**
 * Convert decimal hours to hours and minutes
 * @param decimalHours - Sleep duration in decimal hours (e.g., 7.5 for 7 hours 30 minutes)
 * @returns Object with hours and minutes
 */
export function decimalHoursToHoursMinutes(decimalHours: number): { hours: number; minutes: number } {
  const hours = Math.floor(decimalHours)
  const minutes = Math.round((decimalHours - hours) * 60)
  return { hours, minutes }
}

/**
 * Convert hours and minutes to decimal hours
 * @param hours - Number of hours
 * @param minutes - Number of minutes (0-59)
 * @returns Decimal hours (e.g., 7.5 for 7 hours 30 minutes)
 */
export function hoursMinutesToDecimalHours(hours: number, minutes: number): number {
  return hours + minutes / 60
}

/**
 * Format sleep duration as "X hours Y minutes" or "X hours" if minutes is 0
 * @param decimalHours - Sleep duration in decimal hours
 * @returns Formatted string (e.g., "7 hours 30 minutes" or "8 hours")
 */
export function formatSleepDuration(decimalHours: number | null | undefined): string {
  if (decimalHours === null || decimalHours === undefined) {
    return '-'
  }
  
  const { hours, minutes } = decimalHoursToHoursMinutes(decimalHours)
  
  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`
}

/**
 * Format sleep duration as short string "Xh Ym" or "Xh" if minutes is 0
 * @param decimalHours - Sleep duration in decimal hours
 * @returns Short formatted string (e.g., "7h 30m" or "8h")
 */
export function formatSleepDurationShort(decimalHours: number | null | undefined): string {
  if (decimalHours === null || decimalHours === undefined) {
    return '-'
  }
  
  const { hours, minutes } = decimalHoursToHoursMinutes(decimalHours)
  
  if (minutes === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${minutes}m`
}


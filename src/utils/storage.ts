// Guest mode storage utilities
const GUEST_STORAGE_PREFIX = 'nutriscope_guest_'

export const guestStorage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(`${GUEST_STORAGE_PREFIX}${key}`)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(`${GUEST_STORAGE_PREFIX}${key}`, JSON.stringify(value))
    } catch (error) {
      console.error('Error saving to guest storage:', error)
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(`${GUEST_STORAGE_PREFIX}${key}`)
  },

  clear: (): void => {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(GUEST_STORAGE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  },
}


// localStorage can throw (private mode, blocked storage), so every access is guarded.
export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not saved; the app works without it.
  }
}

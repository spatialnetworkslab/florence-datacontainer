export function warn (message) {
  if (typeof process === 'undefined') console.warn(message)

  if (typeof process === 'object' && process.env.NODE_ENV !== 'test') {
    console.warn(message)
  }
}

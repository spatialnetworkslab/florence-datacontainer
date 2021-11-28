export function warn (message) {
  if (typeof process === 'undefined') console.warn(message)

  if (process && process.env.NODE_ENV !== 'test') {
    console.warn(message)
  }
}

export default function (obj, allowedKeys) {
  const keys = Object.keys(obj)
  if (keys.length !== 1) {
    throw new Error('Invalid transformation syntax')
  }

  const key = keys[0]

  if (!allowedKeys.includes(key)) {
    throw new Error(`Unknown column ${key}`)
  }

  return key
}

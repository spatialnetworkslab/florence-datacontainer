export default function (accessorObject) {
  const keys = Object.keys(accessorObject)

  if (
    accessorObject &&
    accessorObject.constructor === Object &&
    keys.length === 1 &&
    ['index', 'key'].includes(keys[0])
  ) {
    return
  }

  throw new Error('Invalid accessor object, must be either \'{ index: <index> }\'  or \'{ key: <key> }\'')
}

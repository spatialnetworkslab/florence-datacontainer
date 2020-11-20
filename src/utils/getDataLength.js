export default function (data) {
  const keys = Object.keys(data)

  const firstKey = keys[0] === '$key'
    ? keys[1]
    : keys[0]

  const firstColumn = data[firstKey]
  return firstColumn.length
}

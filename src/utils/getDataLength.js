export default function (data) {
  const firstKey = Object.keys(data)[0]
  const firstColumn = data[firstKey]
  return firstColumn.length
}

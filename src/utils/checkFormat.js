export function isColumnOriented (data) {
  if (data.constructor === Object) {
    const columns = Object.keys(data).map(key => data[key])
    return columns.every(column => column.constructor === Array)
  }

  return false
}

export function isRowOriented (data) {
  if (data.constructor === Array) {
    return data.every(row => row.constructor === Object)
  }

  return false
}

export function isGeoJSON (data) {
  const hasCorrectType = data.type === 'FeatureCollection'
  const hasCorrectFeatures = data.features && data.features.length > 0

  return hasCorrectType && hasCorrectFeatures
}

export function checkFormatColumnData (data) {
  checkFormat(data, { internal: false })
}

export function checkFormatInternal (data) {
  checkFormat(data, { internal: true })
}

function checkFormat (data, { internal }) {
  let dataLength = null
  const columnNameChecker = internal
    ? checkInternalDataColumnName
    : checkRegularColumnName

  for (const columnName in data) {
    columnNameChecker(columnName)
    const column = data[columnName]

    dataLength = dataLength || column.length

    if (internal === false && dataLength === 0) {
      throw new Error('Invalid data: columns cannot be empty')
    }

    if (dataLength !== column.length) {
      throw new Error('Invalid data: columns must be of same length')
    }
  }
}

export function checkRegularColumnName (columnName) {
  if (columnName.match(forbiddenChars)) {
    throw new Error(`Invalid column name '${columnName}': '$' is not allowed in column names`)
  }
}

const forbiddenChars = /[/$]/

export function checkInternalDataColumnName (columnName) {
  if (!['$key', '$geometry', '$grouped'].includes(columnName)) {
    checkRegularColumnName(columnName)
  }
}

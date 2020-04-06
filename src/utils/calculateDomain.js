import { calculateBBoxGeometries } from './calculateBBox.js'
import { getDataType, ensureValidDataType } from './getDataType.js'
import { isInvalid } from './equals.js'
import { warn } from './logging.js'

export function calculateDomain (column, columnName) {
  if (columnName === '$grouped') {
    throw new Error(`Cannot calculate domain of column '${columnName}'.`)
  }

  const { firstValidValue, nValidValues } = findFirstValidValue(column)

  if (nValidValues === 0) {
    throw new Error(`Cannot calculate domain of column '${column}'. Column contains only missing values.`)
  }

  if (nValidValues > 0) {
    ensureValidDataType(firstValidValue)
    const type = getDataType(firstValidValue)

    if (columnName === '$geometry') {
      return calculateBBoxGeometries(column)
    }

    if (columnName !== '$geometry') {
      return calculateNonGeometryColumnDomain(column, columnName, nValidValues, firstValidValue, type)
    }
  }
}

export function findFirstValidValue (column) {
  let firstValidValue
  let nValidValues = 0

  for (let i = 0; i < column.length; i++) {
    if (!isInvalid(column[i])) {
      nValidValues++
      firstValidValue = firstValidValue || column[i]
    }

    if (nValidValues > 1) break
  }

  return { firstValidValue, nValidValues }
}

function calculateNonGeometryColumnDomain (column, columnName, nValidValues, firstValidValue, type) {
  let domain
  const nUniqueValues = calculateNumberOfUniqueValues(column, type)

  if (columnHasOnlyOneUniqueValue(nValidValues, nUniqueValues)) {
    domain = calculateDomainForColumnWithOneUniqueValue(
      nValidValues, nUniqueValues, type, firstValidValue, columnName
    )
  } else {
    domain = calculateDomainForRegularColumn(type, column, columnName)
  }

  return domain
}

function calculateNumberOfUniqueValues (col, type) {
  const uniqueVals = {}

  if (['quantitative', 'categorical'].includes(type)) {
    for (let i = 0; i < col.length; i++) {
      const val = col[i]
      if (!isInvalid(val)) {
        uniqueVals[val] = 0
      }
    }
  }

  if (type === 'temporal') {
    for (let i = 0; i < col.length; i++) {
      const val = col[i]
      if (!isInvalid(val)) {
        uniqueVals[val.getTime()] = 0
      }
    }
  }

  if (type === 'interval') {
    for (let i = 0; i < col.length; i++) {
      const val = col[i]
      if (!isInvalid(val)) {
        const str = JSON.stringify(val)
        uniqueVals[str] = 0
      }
    }
  }

  return Object.keys(uniqueVals).length
}

function columnHasOnlyOneUniqueValue (nValidValues, nUniqueValues) {
  return nValidValues === 1 || nUniqueValues === 1
}

function calculateDomainForColumnWithOneUniqueValue (nValidValues, nUniqueValues, type, firstValidValue, columnName) {
  const domain = createDomainForSingleValue(type, firstValidValue)
  const warningText = nValidValues === 1 ? 'valid' : 'unique'

  if (type !== 'categorical') {
    warn(
      `Column '${columnName}' contains only 1 ${warningText} value: ${firstValidValue}.\n` +
      `Using domain ${JSON.stringify(domain)}`
    )
  }

  return domain
}

function calculateDomainForRegularColumn (type, column, columnName) {
  let domain = initDomain(type)

  for (let i = 0; i < column.length; i++) {
    const value = column[i]

    if (!isInvalid(value)) {
      if (getDataType(value) !== type) {
        throw new Error(`Invalid column ${columnName}: column contains multiple data types`)
      }

      domain = updateDomain(domain, value, type)
    }
  }

  return domain
}

const minUnixTime = new Date(0)
const maxUnixTime = new Date('19 January 2038')

function initDomain (type) {
  let domain
  switch (type) {
    case 'quantitative': {
      domain = [Infinity, -Infinity]
      break
    }
    case 'categorical': {
      domain = []
      break
    }
    case 'temporal': {
      domain = [maxUnixTime, minUnixTime]
      break
    }
    case 'interval': {
      domain = [Infinity, -Infinity]
      break
    }
  }

  return domain
}

export function updateDomain (domain, value, type) {
  if (!['quantitative', 'categorical', 'temporal', 'interval'].includes(type)) {
    throw new Error(`Cannot set domain for column of type '${type}'`)
  }

  if (type === 'quantitative') {
    if (domain[0] >= value) { domain[0] = value }
    if (domain[1] <= value) { domain[1] = value }
  }

  if (type === 'categorical') {
    if (!domain.includes(value)) { domain.push(value) }
  }

  if (type === 'temporal') {
    const epoch = value.getTime()

    if (domain[0].getTime() >= epoch) { domain[0] = value }
    if (domain[1].getTime() <= epoch) { domain[1] = value }
  }

  if (type === 'interval') {
    domain = updateDomain(domain, value[0], 'quantitative')
    domain = updateDomain(domain, value[1], 'quantitative')
  }

  return domain
}

function createDomainForSingleValue (type, value) {
  let domain

  if (type === 'quantitative') {
    domain = [value - 1, value + 1]
  }

  if (type === 'categorical') {
    domain = [value]
  }

  if (type === 'temporal') {
    domain = [getDay(value, -1), getDay(value, 1)]
  }

  if (type === 'interval') {
    domain = value.sort((a, b) => a - b)
  }

  return domain
}

function getDay (date, days) {
  const dateCopy = new Date(date.getTime())
  return new Date(dateCopy.setDate(dateCopy.getDate() + days))
}

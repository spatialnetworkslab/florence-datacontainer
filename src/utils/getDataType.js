import DataContainer from '../index.js'
import { findFirstValidValue } from './calculateDomain.js'
import { isInvalid } from './equals.js'

export function getColumnType (column) {
  const { firstValidValue } = findFirstValidValue(column)
  return getDataType(firstValidValue)
}

export function getDataType (value) {
  if (isInvalid(value)) return undefined

  if (value.constructor === Number) return 'quantitative'
  if (value.constructor === String) return 'categorical'
  if (value.constructor === Date) return 'temporal'
  if (isInterval(value)) return 'interval'
  if (isGeometry(value)) return 'geometry'
  if (value.constructor === DataContainer) return 'grouped'

  return undefined
}

export function ensureValidDataType (value) {
  if (isInvalid(getDataType(value))) {
    throw new Error('Invalid data')
  }
}

function isGeometry (value) {
  return value.constructor === Object && 'type' in value && 'coordinates' in value
}

function isInterval (value) {
  return value.constructor === Array && value.length === 2 && value.every(entry => entry.constructor === Number)
}

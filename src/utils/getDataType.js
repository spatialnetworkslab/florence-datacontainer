import DataContainer from '../index.js'
import { findFirstValidValue } from './calculateDomain.js'

export function getColumnType (column) {
  const { firstValidValue, nValidValues } = findFirstValidValue(column)

  if (nValidValues === 0) {
    throw new Error(`Cannot determine type of column '${column}'. Column contains only missing values.`)
  }

  return getDataType(firstValidValue)
}

export function getDataType (value, throwError = true) {
  if (value.constructor === Number) return 'quantitative'
  if (value.constructor === String) return 'categorical'
  if (value.constructor === Date) return 'temporal'
  if (isInterval(value)) return 'interval'
  if (isGeometry(value)) return 'geometry'
  if (value.constructor === DataContainer) return 'nested'

  throwIf(throwError)
}

function isGeometry (value) {
  return value.constructor === Object && 'type' in value && 'coordinates' in value
}

function isInterval (value) {
  return value.constructor === Array && value.length === 2 && value.every(entry => entry.constructor === Number)
}

function throwIf (throwError) {
  if (throwError) {
    throw new Error('Invalid data')
  }
}

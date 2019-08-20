import { calculateDomain } from './calculateDomain.js'
import { getDataType } from './getDataType.js'

export function getNewKey (keyColumn) {
  const domain = calculateDomain(keyColumn, '$key')
  return domain[1] + 1
}

export function generateKeyColumn (length) {
  return new Array(length).fill(0).map((_, i) => i)
}

export function validateKeyColumn (keyColumn, requiredLength) {
  if (keyColumn.length !== requiredLength) {
    throw new Error('key array must be of same length as rest of the data')
  }

  ensureAllSameType(keyColumn)
  ensureUnique(keyColumn)
}

function ensureAllSameType (keyColumn) {
  const type = getKeyType(keyColumn[0])

  for (let i = 1; i < keyColumn.length; i++) {
    const key = keyColumn[i]
    if (getKeyType(key) !== type) {
      throw new Error('mixing types not allowed in key column')
    }
  }
}

function getKeyType (key) {
  const type = getDataType(key)

  if (type === 'quantitative' && Number.isInteger(key)) return type
  if (type === 'categorical' && key.length > 0) return type

  throw new Error('key column must contain only integers or strings')
}

function ensureUnique (keyColumn) {
  if (keyColumn.length !== new Set(keyColumn).size) {
    throw new Error('Keys must be unique')
  }
}

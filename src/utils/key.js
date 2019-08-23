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
    throw new Error('Key column must be of same length as rest of the data')
  }

  ensureAllSameType(keyColumn)
  ensureUnique(keyColumn)
}

function ensureAllSameType (keyColumn) {
  for (let i = 0; i < keyColumn.length; i++) {
    const key = keyColumn[i]
    validateKey(key)
  }
}

function validateKey (key) {
  const type = getDataType(key)

  if (type !== 'quantitative' || !Number.isInteger(key)) {
    throw new Error('Key column can contain only integers')
  }
}

function ensureUnique (keyColumn) {
  if (keyColumn.length !== new Set(keyColumn).size) {
    throw new Error('Keys must be unique')
  }
}

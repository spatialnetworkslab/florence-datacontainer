export function generateKeyColumn (length) {
  return new Array(length).fill(0).map((_, i) => i)
}

export function validateKeyColumn (keyColumn, requiredLength) {
  if (keyColumn.length !== requiredLength) {
    throw new Error('Key column must be of same length as rest of the data')
  }

  ensureUnique(keyColumn)
}

function ensureUnique (keyColumn) {
  if (keyColumn.length !== new Set(keyColumn).size) {
    throw new Error('Keys must be unique')
  }
}

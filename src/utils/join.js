import { isDefined, isUndefined } from './equals.js'
import getDataLength from './getDataLength.js'
import DataContainer from '../index.js'
import { getColumnType } from './getDataType.js'

export function getJoinColumns (left, right, by) {
  const leftData = left.data()
  const rightData = right.data()

  if (isUndefined(by)) {
    const leftDataLength = getDataLength(leftData)
    const joinColumns = {}

    for (const columnName in rightData) {
      if (columnName !== '$key') {
        const rightColumn = rightData[columnName]
        joinColumns[columnName] = rightColumn.slice(0, leftDataLength)
      }
    }

    return joinColumns
  }

  if (isDefined(by)) {
    const joinColumns = initJoinColumns(rightData, by[1])

    const rightRowsByKey = generateRightRowsByKey(rightData, by[1])
    const leftByColumn = leftData[by[0]]

    for (let i = 0; i < leftByColumn.length; i++) {
      const leftKey = leftByColumn[i]
      const row = rightRowsByKey[leftKey]

      for (const columnName in row) {
        joinColumns[columnName].push(row[columnName])
      }
    }

    return joinColumns
  }
}

function initJoinColumns (right, byColumnName) {
  const joinColumns = {}

  for (const columnName in right) {
    if (columnName !== '$key' && columnName !== byColumnName) {
      joinColumns[columnName] = []
    }
  }

  return joinColumns
}

function generateRightRowsByKey (right, byColumnName) {
  const rightRowsByKey = {}
  const byColumn = right[byColumnName]

  for (let i = 0; i < byColumn.length; i++) {
    const key = byColumn[i]
    const row = {}

    for (const columnName in right) {
      if (columnName !== '$key' && columnName !== byColumnName) {
        row[columnName] = right[columnName][i]
      }
    }

    rightRowsByKey[key] = row
  }

  return rightRowsByKey
}

export function validateJoin (left, right, by) {
  const leftData = left.data()
  const rightData = getRightData(right)

  if (isUndefined(by)) {
    const leftLength = getDataLength(leftData)
    const rightLength = getDataLength(rightData)

    if (rightLength < leftLength) {
      throw new Error(
        'Without \'by\', the right DataContainer must be the same length as or longer than left DataContainer'
      )
    }
  }

  if (isDefined(by)) {
    validateByColumnsExist(leftData, rightData, by)
    ensureColumnsAreCompatible(leftData, rightData, by)
    ensureNoDuplicateColumnNames(leftData, rightData, by)
  }
}

function getRightData (right) {
  if (!(right instanceof DataContainer)) {
    throw new Error('It is only possible to join another DataContainer')
  }

  return right.data()
}

function validateByColumnsExist (left, right, by) {
  if (!(by.constructor === Array && by.length === 2 && by.every(c => c.constructor === String))) {
    throw new Error('Invalid format of \'by\'. Must be Array of two column names.')
  }

  const [leftColumnName, rightColumnName] = by

  if (!(leftColumnName in left)) {
    throw new Error(`Column '${leftColumnName}' not found`)
  }

  if (!(rightColumnName in right)) {
    throw new Error(`Column '${rightColumnName}' not found`)
  }
}

function ensureColumnsAreCompatible (left, right, by) {
  const [leftColumnName, rightColumnName] = by
  const leftColumn = left[leftColumnName]
  const rightColumn = right[rightColumnName]

  const leftType = getColumnType(leftColumn)
  const rightType = getColumnType(rightColumn)

  if (leftType !== rightType) throw new Error('\'by\' columns must be of the same type')

  ensureRightByColumnIsUnique(right[rightColumnName])
  ensureLeftColumnIsSubsetOfRightColumn(leftColumn, rightColumn)
}

function ensureRightByColumnIsUnique (column) {
  if (column.length !== new Set(column).size) {
    throw new Error('Right \'by\' column must contain only unique values')
  }
}

function ensureLeftColumnIsSubsetOfRightColumn (leftColumn, rightColumn) {
  const rightSet = new Set(rightColumn)

  for (let i = 0; i < leftColumn.length; i++) {
    const leftKey = leftColumn[i]
    if (!rightSet.has(leftKey)) {
      throw new Error('Left \'by\' column must be subset of right column')
    }
  }
}

function ensureNoDuplicateColumnNames (left, right, by) {
  const rightColumnName = by[1]

  for (const columnName in right) {
    if (columnName !== '$key' && columnName in left) {
      if (columnName !== rightColumnName) {
        throw new Error(`Duplicate column name: '${columnName}'`)
      }
    }
  }
}

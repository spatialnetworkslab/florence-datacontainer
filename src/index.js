import dataLoadingMixin from './dataLoadingMixin.js'
import transformationsMixin from './transformationsMixin.js'

import { isColumnOriented, isRowOriented, isGeoJSON } from './utils/checkFormat.js'
import { ensureValidRow, ensureRowExists } from './utils/ensureValidRow.js'
import { isValidColumn } from './utils/isValidColumn.js'
import {
  checkColumnPath, columnPathIsValid, ensureColumnExists,
  getColumn, mapColumn,
  getFinalColumnName
} from './utils/parseColumnPath.js'
import { calculateDomain } from './utils/calculateDomain.js'
import { getColumnType } from './utils/getDataType.js'

import { warn } from './utils/logging.js'
import id from './utils/id.js'

import { Group } from './transformations/groupBy.js'

export default class DataContainer {
  constructor (data) {
    this._data = {}
    this._length = undefined
    this._keyToRowNumber = {}

    this._domainsAndTypesCalculated = false

    this._domains = {}
    this._types = {}

    if (isColumnOriented(data)) {
      this._setColumnData(data)
      return
    }

    if (isRowOriented(data)) {
      this._setRowData(data)
      return
    }

    if (isGeoJSON(data)) {
      this._setGeoJSON(data)
      return
    }

    if (data instanceof Group) {
      this._setGroup(data)
      return
    }

    throw invalidDataError
  }

  // Getters
  data () {
    return this._data
  }

  row (key) {
    const rowNumber = this._keyToRowNumber[key]
    return this._row(rowNumber)
  }

  rows () {
    const rows = []

    for (let i = 0; i < this._length; i++) {
      rows.push(this._row(i))
    }

    return rows
  }

  column (columnPath) {
    checkColumnPath(columnPath, this)
    return getColumn(columnPath, this)
  }

  map (columnPath, mapFunction) {
    checkColumnPath(columnPath, this)
    return mapColumn(columnPath, this, mapFunction)
  }

  domain (columnName) {
    ensureColumnExists(columnName, this)
    const column = this.column(columnName)
    return calculateDomain(column, columnName)
  }

  type (columnName) {
    ensureColumnExists(columnName, this)
    const column = this.column(columnName)
    return getColumnType(column, columnName)
  }

  // Checks
  hasColumn (columnPath) {
    return columnPathIsValid(columnPath, this)
  }

  columnIsValid (columnPath) {
    const column = this.column(columnPath)
    return isValidColumn(column, getFinalColumnName(columnPath), { throwError: false })
  }

  validateColumn (columnPath) {
    const column = this.column(columnPath)
    isValidColumn(column, getFinalColumnName(columnPath), { throwError: true })
  }

  validateAllColumns () {
    for (const columnName in this._data) {
      const column = this.column(columnName)
      isValidColumn(column, columnName, { throwError: true })
    }
  }

  // Modifiers
  addRow (row) {
    ensureValidRow(row, this)

    for (const columnName in row) {
      this._data[columnName].push(row[columnName])
    }

    const rowNumber = this._length
    const key = id()

    this._data.$key.push(key)
    this._keyToRowNumber[key] = rowNumber
  }

  updateRow (key, row) {
    ensureRowExists(key, this)
    const rowNumber = this._keyToRowNumber[key]

    for (const columnName in row) {
      ensureColumnExists(columnName, this)

      if (columnName === '$key') {
        warn(`Cannot update '$key' of row`)
        continue
      }

      const value = row[columnName]
      this._data[columnName][rowNumber] = value
    }
  }

  deleteRow (key) {
    ensureRowExists(key, this)
    const rowNumber = this._keyToRowNumber[key]
    delete this._keyToRowNumber[key]

    for (const columnName in this._data) {
      this._data[columnName].splice(rowNumber, 1)
    }
  }

  // Private methods
  _row (rowNumber) {
    const row = {}

    for (const columnName in this._data) {
      const value = this._data[columnName][rowNumber]
      row[columnName] = value
    }

    return row
  }
}

dataLoadingMixin(DataContainer)
transformationsMixin(DataContainer)

const invalidDataError = new Error('Data passed to DataContainer is of unknown format')

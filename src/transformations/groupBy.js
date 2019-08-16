import getDataLength from '../utils/getDataLength.js'
import DataContainer from '../index.js'

export default function (data, groupByInstructions) {
  const groupedData = {}

  const groupedColumns = getGroupedColumns(data, groupByInstructions)
  const groups = groupBy(data, groupedColumns)

  groupedData.$grouped = groups.map(group => new DataContainer(group))
  for (const col of groupedColumns) {
    groupedData[col] = []
  }

  for (let i = 0; i < groupedColumns.length; i++) {
    const col = groupedColumns[i]

    for (const group of groups) {
      groupedData[col].push(group.groupedValues[i])
    }
  }

  return groupedData
}

function getGroupedColumns (data, groupByInstructions) {
  const con = groupByInstructions.constructor
  if (![String, Array].includes(con)) {
    throw new Error('groupBy can only be used with a string or array of strings')
  }

  const groupedColumns = con === String ? [groupByInstructions] : groupByInstructions

  for (const col of groupedColumns) {
    if (!(col in data)) {
      throw new Error(`Column '${col}' not found`)
    }
  }

  if (groupedColumns.length === Object.keys(data).length) {
    throw new Error('Cannot group by all columns')
  }

  return groupedColumns
}

function getGroupedValues (data, i, columns) {
  const groupedValues = []
  for (const col of columns) {
    groupedValues.push(data[col][i])
  }

  return groupedValues
}

function groupBy (data, groupedColumns) {
  const groups = {}

  const length = getDataLength(data)

  for (let i = 0; i < length; i++) {
    // Ge grouped values
    const groupedValues = getGroupedValues(data, i, groupedColumns)

    // Get unique identifier for group
    const groupID = JSON.stringify(groupedValues)

    // If groups object has no entry for this group yet: create new group object
    groups[groupID] = groups[groupID] || new Group(data, groupedValues)

    // Add row to group
    groups[groupID].addRow(data, i)
  }

  // Convert groups object to array
  return Object.keys(groups).map(group => {
    return groups[group]
  })
}

export class Group {
  constructor (data, groupedValues) {
    this.data = {}
    this.groupedValues = groupedValues

    for (const col in data) {
      this.data[col] = []
    }
  }

  addRow (data, i) {
    for (const col in data) {
      this.data[col].push(data[col][i])
    }
  }
}

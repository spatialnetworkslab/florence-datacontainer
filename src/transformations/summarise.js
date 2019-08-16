import aggregations from './aggregations'
import checkKeyValuePair from '../utils/checkKeyValuePair.js'
import { checkRegularColumnName } from '../utils/checkFormat.js'

export default function (data, summariseInstructions) {
  if (summariseInstructions.constructor !== Object) {
    throw new Error('summarise must be an object')
  }

  let newData = initNewData(summariseInstructions, data)

  if ('$grouped' in data) {
    checkSummariseInstructions(summariseInstructions, data)

    for (const columnName in data) {
      if (columnName !== '$grouped') {
        newData[columnName] = data[columnName]
      }
    }

    for (const group of data.$grouped) {
      const data = group.data()
      newData = summariseGroup(data, summariseInstructions, newData)
    }
  } else {
    newData = summariseGroup(data, summariseInstructions, newData)
  }
  return newData
}

export function initNewData (summariseInstructions, data) {
  const newData = {}
  for (const newCol in summariseInstructions) { newData[newCol] = [] }
  if (data && '$grouped' in data) {
    for (const col in data) {
      if (col !== '$grouped') {
        newData[col] = []
      }
    }
  }
  return newData
}

export function summariseGroup (data, summariseInstructions, newData) {
  for (const newColName in summariseInstructions) {
    const instruction = summariseInstructions[newColName]

    // If the aggregation instructions are an Object, only one column will be
    // used as summary: the column that is used as key in the Object
    if (instruction.constructor === Object) {
      const column = checkKeyValuePair(instruction, Object.keys(data))
      const aggregation = instruction[column]

      if (aggregation.constructor === String) {
        newData[newColName].push(aggregations[aggregation](data[column]))
      } else if (aggregation.constructor === Function) {
        newData[newColName].push(aggregation(data[column]))
      } else {
        throw new Error(`Invalid aggregation instruction: ${aggregation}. Must be String or Function`)
      }
    }
  }

  return newData
}

export function checkSummariseInstructions (summariseInstructions, data) {
  for (const newColName in summariseInstructions) {
    const instruction = summariseInstructions[newColName]
    const name = Object.keys(instruction)[0]

    checkRegularColumnName(name)

    if (name in data) {
      throw new Error(`Cannot summarise the column '${name}': used for grouping`)
    }
  }
}

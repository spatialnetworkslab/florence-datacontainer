import {
  classifyEqInterval,
  classifyJenks,
  classifyQuantile,
  classifyStdDeviation,
  classifyCkmeans
} from 'classify-series'

import DataContainer from '../index.js'
import getDataLength from '../utils/getDataLength.js'
import { calculateDomain } from '../utils/calculateDomain.js'
import { warn } from '../utils/logging.js'

const methodMap = {
  EqualInterval: classifyEqInterval,
  StandardDeviation: classifyStdDeviation,
  Quantile: classifyQuantile,
  Jenks: classifyJenks,
  CKMeans: classifyCkmeans
}

export default function (data, binInstructions) {
  if (binInstructions.constructor === Object) {
    const intervalBounds = getIntervalBounds(data, binInstructions)
    const ranges = pairRanges(intervalBounds)

    return bin1d(data, binInstructions.groupBy, ranges)
  }

  if (binInstructions.constructor === Array) {
    const intervalBoundsPerVariable = binInstructions.map(instructions => getIntervalBounds(data, instructions))
    const rangesPerVariable = intervalBoundsPerVariable.map(bounds => pairRanges(bounds))
    const variables = binInstructions.map(instructions => instructions.groupBy)

    return binKd(data, variables, rangesPerVariable)
  }
}

export function getIntervalBounds (data, binInstructions) {
  const { groupBy, method, numClasses } = parseBinInstructions(binInstructions)

  const variableData = data[groupBy]
  if (!variableData) {
    throw new Error(`groupBy column '${groupBy}' does not exist`)
  }

  if (method === 'IntervalSize') {
    return createRangesFromBinSize(variableData, binInstructions.binSize)
  }

  if (method === 'Manual') {
    return binInstructions.manualClasses
  }

  return methodMap[method](variableData, numClasses)
}

function parseBinInstructions (binInstructions) {
  if (binInstructions.constructor !== Object) {
    throw new Error('Bin only accepts an Object')
  }

  const groupBy = binInstructions.groupBy
  if (groupBy.constructor !== String) {
    throw new Error('groupBy only accepts a String variable name')
  }

  let method = binInstructions.method
  if (!method) {
    warn('No binning method specified, defaulting to EqualInterval')
    method = 'EqualInterval'
  }
  if (method.constructor !== String) {
    warn('Binning method not recognized, defaulting to EqualInterval')
    method = 'EqualInterval'
  }

  let numClasses = binInstructions.numClasses
  if (!numClasses) {
    warn('numClasses not specified, defaulting to 5')
    numClasses = 5
  }

  return { groupBy, method, numClasses }
}

function createRangesFromBinSize (variableData, binSize) {
  if (!binSize) {
    throw new Error('Missing required option \'binSize\'')
  }

  const domain = calculateDomain(variableData)

  const binCount = Math.floor((domain[1] - domain[0]) / binSize)

  let lowerBound = domain[0]
  const ranges = [lowerBound]

  for (let i = 0; i < binCount - 1; i++) {
    const upperBound = lowerBound + binSize
    ranges.push(upperBound)
    lowerBound = upperBound
  }

  ranges.push(domain[1])

  return ranges
}

function pairRanges (ranges) {
  const l = ranges.length
  const newRange = []

  for (let i = 0; i < l - 1; i++) {
    newRange.push([ranges[i], ranges[i + 1]])
  }

  return newRange
}

function bin1d (data, variable, ranges) {
  // Create an empty array to store new groups divided by range
  const groups = Array(ranges.length)

  for (let i = 0; i < groups.length; i++) {
    groups[i] = {}

    for (const col in data) {
      groups[i][col] = []
    }
  }

  const length = getDataLength(data)

  for (let i = 0; i < length; i++) {
    const value = data[variable][i]
    const binIndex = getBinIndex(ranges, value)

    if (binIndex !== -1) {
      for (const col in data) {
        groups[binIndex][col].push(data[col][i])
      }
    }
  }

  // Remove empty bins
  const nonEmptyBinIndices = getNonEmptyBinIndices(groups)
  const nonEmptyRanges = nonEmptyBinIndices.map(i => ranges[i])
  const nonEmptyGroups = nonEmptyBinIndices.map(i => groups[i])

  // Add new grouped column to newData
  const newData = {
    bins: nonEmptyRanges,
    $grouped: nonEmptyGroups.map(group => new DataContainer(group, { validate: false }))
  }

  return newData
}

function getBinIndex (bins, value) {
  // Find index of bin in which the instance belongs
  const binIndex = bins.findIndex(function (bin, i) {
    if (i === bins.length - 1) {
      return value >= bin[0] && value <= bin[1]
    } else {
      return value >= bin[0] && value < bin[1]
    }
  })

  return binIndex
}

function getNonEmptyBinIndices (groups) {
  const nonEmptyBinIndices = []

  for (let i = 0; i < groups.length; i++) {
    if (getDataLength(groups[i]) > 0) nonEmptyBinIndices.push(i)
  }

  return nonEmptyBinIndices
}

function binKd (data, variables, rangesPerVariable) {
  const binIndexTree = constructBinIndexTree(data, variables, rangesPerVariable)
  const binnedData = convertTreeIntoColumnData(binIndexTree, variables, rangesPerVariable)

  binnedData.$grouped = binnedData.$grouped.map(group => new DataContainer(group, { validate: false }))

  return binnedData
}

function constructBinIndexTree (data, variables, rangesPerVariable) {
  let binIndexTree = {}
  const dataLength = getDataLength(data)

  for (let i = 0; i < dataLength; i++) {
    const binIndices = getBinIndices(data, i, variables, rangesPerVariable)
    if (rowIsNotEmpty(binIndices)) {
      binIndexTree = updateBranch(binIndexTree, binIndices, data, i)
    }
  }

  return binIndexTree
}

function getBinIndices (data, index, variables, rangesPerVariable) {
  const binIndices = []

  for (let i = 0; i < variables.length; i++) {
    const variable = variables[i]
    const value = data[variable][index]

    binIndices.push(getBinIndex(rangesPerVariable[i], value))
  }

  return binIndices
}

function rowIsNotEmpty (binIndices) {
  return binIndices.every(binIndex => binIndex > -1)
}

function updateBranch (tree, indices, data, rowIndex) {
  let currentLevel = tree

  for (let i = 0; i < indices.length; i++) {
    const index = indices[i]

    if (lastIndex(i, indices.length)) {
      if (!(index in currentLevel)) {
        currentLevel[index] = initGroup(data)
      }

      currentLevel[index] = addRow(currentLevel[index], data, rowIndex)
    } else {
      if (!(index in currentLevel)) {
        currentLevel[index] = {}
      }

      currentLevel = currentLevel[index]
    }
  }

  return tree
}

function lastIndex (i, length) {
  return i === (length - 1)
}

function initGroup (data) {
  const group = {}
  for (const columnName in data) {
    group[columnName] = []
  }

  return group
}

function addRow (group, data, rowIndex) {
  for (const columnName in data) {
    group[columnName].push(data[columnName][rowIndex])
  }

  return group
}

function convertTreeIntoColumnData (binIndexTree, variables, binsPerVariable) {
  const columnData = initColumnData(variables)
  const dataIndex = variables.length

  forEachBranch(binIndexTree, branchArray => {
    for (let i = 0; i < variables.length; i++) {
      const binIndex = branchArray[i]
      const bin = binsPerVariable[i][binIndex]

      const binnedColumnName = getBinnedColumnName(variables[i])

      columnData[binnedColumnName].push(bin)
    }

    columnData.$grouped.push(branchArray[dataIndex])
  })

  return columnData
}

function initColumnData (variables) {
  const columnData = { $grouped: [] }

  for (let i = 0; i < variables.length; i++) {
    const binnedColumnName = getBinnedColumnName(variables[i])
    columnData[binnedColumnName] = []
  }

  return columnData
}

function forEachBranch (tree, callback) {
  for (const path of traverse(tree)) {
    callback(path)
  }
}

// https://stackoverflow.com/a/45628445
function * traverse (o) {
  const memory = new Set()

  function * innerTraversal (o, path = []) {
    if (memory.has(o)) {
      // we've seen this object before don't iterate it
      return
    }

    // add the new object to our memory.
    memory.add(o)

    for (const i of Object.keys(o)) {
      const itemPath = path.concat(i)

      if (!('$key' in o[i])) {
        yield * innerTraversal(o[i], itemPath)
      } else {
        itemPath.push(o[i])
        yield itemPath
      }
    }
  }

  yield * innerTraversal(o)
}

function getBinnedColumnName (columnName) {
  return 'bins_' + columnName
}

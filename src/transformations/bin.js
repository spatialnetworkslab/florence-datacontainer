import DataContainer from '../index.js'
import getDataLength from '../utils/getDataLength.js'
import Geostats from '../utils/geoStats.js'
import { calculateDomain } from '../utils/calculateDomain.js'

import { warn } from '../utils/logging.js'
import filter from './filter.js';

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

  const geoStat = new Geostats(variableData)
  return geoStat[methodMap[method]](numClasses)
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

const methodMap = {
  EqualInterval: 'getClassEqInterval',
  StandardDeviation: 'getClassStdDeviation',
  ArithmeticProgression: 'getClassArithmeticProgression',
  GeometricProgression: 'getClassGeometricProgression',
  Quantile: 'getClassQuantile',
  Jenks: 'getClassJenks'
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

  // Loop through data
  for (let ix = 0; ix < length; ix++) {
    const instance = data[variable][ix]

    // Find index of bin in which the instance belongs
    const binIndex = ranges.findIndex(function (el, i) {
      if (i === ranges.length - 1) {
        return instance >= el[0] && instance <= el[1]
      } else {
        return instance >= el[0] && instance < el[1]
      }
    })

    for (const col in data) {
      groups[binIndex][col].push(data[col][ix])
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

function getNonEmptyBinIndices (groups) {
  const nonEmptyBinIndices = []

  for (let i = 0; i < groups.length; i++) {
    if (getDataLength(groups[i]) > 0) nonEmptyBinIndices.push(i)
  }

  return nonEmptyBinIndices
}

function binKd (data, variables, rangesPerVariable) {
  // TODO
}

import DataContainer from '../index.js'
import getDataLength from '../utils/getDataLength.js'
import Geostats from '../utils/geoStats.js'
import { calculateDomain } from '../utils/calculateDomain.js'

import { warn } from '../utils/logging.js'

export default function (data, binInstructions) {
  const intervalBounds = getIntervalBounds(data, binInstructions)
  const ranges = pairRange(intervalBounds)

  const newData = bin(data, binInstructions.groupBy, ranges)
  return newData
}

export function getIntervalBounds (data, binInstructions) {
  const { groupBy, method, numClasses } = parseBinInstructions(binInstructions)

  const variableData = data[groupBy]
  if (!variableData) {
    throw new Error(`groupBy variable ${groupBy} does not exist`)
  }

  const geoStat = new Geostats(variableData)

  // Calculate ranges to obtain bins of a specified size
  if (method === 'IntervalSize') {
    let binSize = binInstructions.binSize

    const domain = calculateDomain(variableData)
    if (!binSize) {
      warn(`binSize not specified for IntervalSize binning, defaulting to ${(domain[1] - domain[0])}`)
      binSize = domain[1] - domain[0]
    }
    const binCount = Math.floor((domain[1] - domain[0]) / binSize)

    return createRangesFromInterval(domain, binSize, binCount)
  } else if (method === 'EqualInterval') {
    return geoStat.getClassEqInterval(numClasses)
  } else if (method === 'StandardDeviation') {
    return geoStat.getClassStdDeviation(numClasses)
  } else if (method === 'ArithmeticProgression') {
    return geoStat.getClassArithmeticProgression(numClasses)
  } else if (method === 'GeometricProgression') {
    return geoStat.getClassGeometricProgression(numClasses)
  } else if (method === 'Quantile') {
    return geoStat.getClassQuantile(numClasses)
  } else if (method === 'Jenks') {
    return geoStat.getClassJenks(numClasses)
  } else if (method === 'Manual') {
    return binInstructions.manualClasses
  }
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

function createRangesFromInterval (domain, interval, binCount) {
  let lowerBound = domain[0]
  const ranges = [lowerBound]

  for (let i = 0; i < binCount - 1; i++) {
    const upperBound = lowerBound + interval
    ranges.push(upperBound)
    lowerBound = upperBound
  }

  ranges.push(domain[1])

  return ranges
}

function pairRange (ranges) {
  const l = ranges.length
  const newRange = []

  for (let i = 0; i < l - 1; i++) {
    newRange.push([ranges[i], ranges[i + 1]])
  }

  return newRange
}

function bin (data, variable, ranges) {
  const newData = { bins: ranges }

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

  // Add new grouped column to newData
  newData.$grouped = groups.map(group => new DataContainer(group, { validate: false }))

  return newData
}

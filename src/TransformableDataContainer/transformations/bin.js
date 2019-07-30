import DataContainer from '../../index.js'
import getDataLength from '../../utils/getDataLength.js'
import Geostats from '../../utils/geoStats.js'

import { warn } from '../../helpers/logging.js'

export default function (data, binInstructions) {
  const intervalBounds = getIntervalBounds(data, binInstructions)
  const ranges = pairRange(intervalBounds)

  const newData = bin(data, binInstructions.groupBy, ranges)
  return newData
}

export function getIntervalBounds (data, binInstructions) {
  if (binInstructions.constructor !== Object) {
    throw new Error('Bin only accepts an Object')
  }

  const key = binInstructions.groupBy
  if (key.constructor !== String) {
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

  const variableData = data[key]
  if (!variableData) {
    throw new Error(`groupBy variable ${key} does not exist`)
  }
  const geoStat = new Geostats(variableData)

  let ranges

  // Calculate ranges to obtain bins of a specified size
  if (method === 'IntervalSize') {
    let binSize = binInstructions.binSize

    const domain = variableDomain(variableData)
    if (!binSize) {
      warn(`binSize not specified for IntervalSize binning, defaulting to ${(domain[1] - domain[0])}`)
      binSize = domain[1] - domain[0]
    }
    const binCount = Math.floor((domain[1] - domain[0]) / binSize)

    ranges = rangeFromInterval(domain, binSize, binCount)
    const newData = bin(data, key, ranges)
    return newData
  } else if (method === 'EqualInterval') {
    ranges = geoStat.getClassEqInterval(numClasses)
  } else if (method === 'StandardDeviation') {
    ranges = geoStat.getClassStdDeviation(numClasses)
  } else if (method === 'ArithmeticProgression') {
    ranges = geoStat.getClassArithmeticProgression(numClasses)
  } else if (method === 'GeometricProgression') {
    ranges = geoStat.getClassGeometricProgression(numClasses)
  } else if (method === 'Quantile') {
    ranges = geoStat.getClassQuantile(numClasses)
  } else if (method === 'Jenks') {
    ranges = geoStat.getClassJenks(numClasses)
  } else if (method === 'Manual') {
    ranges = binInstructions.manualClasses
  }

  return ranges
}

// Extract domain of variable of interest
function variableDomain (column) {
  const asc = column.sort((a, b) => a - b)

  const domain = []
  domain.push(asc[0])
  domain.push(asc[asc.length - 1])

  return domain
}

function rangeFromInterval (domain, interval, binCount) {
  const ranges = []

  // Ranges should start at the minimum value of variable of interest
  let lowerBound = domain[0]

  for (let i = 0; i < binCount; i++) {
    const upperBound = lowerBound + interval

    ranges.push([lowerBound, upperBound])

    lowerBound = upperBound
  }
  if (lowerBound < domain[1]) {
    ranges.push([lowerBound, domain[1]])
  }
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

  // Create an empty array to store new DataContainers divided by range
  const bins = Array(ranges.length)

  for (let b = 0; b < bins.length; b++) {
    bins[b] = {}

    for (const col in data) {
      // If data key does not exist, create it
      bins[b][col] = []
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

    const newRow = bins[binIndex]

    for (const col in data) {
      newRow[col].push(data[col][ix])
    }

    // Update the bins column with new DataContainer
    const dataContainer = new DataContainer(newRow)
    bins[binIndex] = dataContainer
  }

  // Add new grouped column to newData
  newData.$grouped = bins
  return newData
}

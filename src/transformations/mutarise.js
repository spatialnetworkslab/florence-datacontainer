import { initNewData, summariseGroup, checkSummariseInstructions } from './summarise.js'
import getDataLength from '../utils/getDataLength.js'

export default function (data, mutariseInstructions) {
  if (mutariseInstructions.constructor !== Object) {
    throw new Error('mutarise must be an object')
  }

  let newCols = initNewData(mutariseInstructions)

  if ('$grouped' in data) {
    checkSummariseInstructions(mutariseInstructions, data)

    for (const group of data.$grouped) {
      let summarizedData = initNewData(mutariseInstructions)
      const dataInGroup = group.data()
      summarizedData = summariseGroup(dataInGroup, mutariseInstructions, summarizedData)

      const length = getDataLength(dataInGroup)
      newCols = addGroupSummaries(newCols, summarizedData, length)
    }

    data = ungroup(data)
  } else {
    let summarizedData = initNewData(mutariseInstructions)
    summarizedData = summariseGroup(data, mutariseInstructions, summarizedData)

    const length = getDataLength(data)
    newCols = addGroupSummaries(newCols, summarizedData, length)
  }

  return join(data, newCols)
}

function addGroupSummaries (newCols, summarizedData, length) {
  for (let i = 0; i < length; i++) {
    for (const key in summarizedData) {
      newCols[key].push(summarizedData[key][0])
    }
  }

  return newCols
}

function ungroup (data) {
  const newData = initNewData(data.$grouped[0].data())

  for (const group of data.$grouped) {
    const groupData = group.data()
    for (const col in newData) {
      newData[col].push(...groupData[col])
    }
  }

  return newData
}

function join (data, newCols) {
  for (const col in newCols) {
    data[col] = newCols[col]
  }

  return data
}

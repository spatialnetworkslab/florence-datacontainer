import { checkRegularColumnName } from '../utils/checkFormat.js'
import { warn } from '../utils/logging.js'

export default function (data, renameInstructions) {
  if (renameInstructions.constructor !== Object) {
    throw new Error('Rename only accepts an object')
  }

  const newData = Object.assign({}, data)

  for (const oldName in renameInstructions) {
    if (oldName in data) {
      const newName = renameInstructions[oldName]
      checkRegularColumnName(newName)

      newData[newName] = newData[oldName]
      delete newData[oldName]
    } else {
      warn(`Rename: column '${oldName}' not found`)
    }
  }

  return newData
}

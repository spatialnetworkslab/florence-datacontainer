export default function (data, selection) {
  if (selection.constructor === String) {
    selection = [selection]
  }

  if (selection.constructor === Array) {
    validateSelectionInstructions(data, selection)

    for (const columnName in data) {
      if (!selection.includes(columnName)) {
        delete data[columnName]
      }
    }
  } else {
    throw new Error('select can only be used with a string or array of strings')
  }
}

function validateSelectionInstructions (data, selection) {
  for (const columnName of selection) {
    if (!(columnName in data)) {
      throw new Error(`Column '${columnName}' not found`)
    }
  }
}

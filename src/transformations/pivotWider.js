import { pivotWider, into, columnOriented } from '@snlab/ducebox'

export default function (_data, pivotInstructions) {
  const data = Object.assign({}, _data)
  delete data.$key

  return into(
    columnOriented.accumulator(),
    pivotWider(pivotInstructions),
    columnOriented.wrap(data)
  )
}

import { pivotLonger, into, columnOriented } from '@snlab/ducebox'

export default function (_data, pivotInstructions) {
  const data = Object.assign({}, _data)
  delete data.$key

  console.log(data)

  return into(
    columnOriented.accumulator(),
    pivotLonger(pivotInstructions),
    columnOriented.wrap(data)
  )
}

import { calculateDomain } from './calculateDomain.js'

export default function (keyColumn) {
  const domain = calculateDomain(keyColumn, '$key')
  return domain[1] + 1
}

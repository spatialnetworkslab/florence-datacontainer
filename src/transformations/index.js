import produce from 'immer'

import filter from './filter.js'
import select from './select.js'
import arrange from './arrange.js'
import rename from './rename.js'
import { mutate, transmute } from './mutate.js'
import summarise from './summarise.js'
import mutarise from './mutarise.js'
import groupBy from './groupBy.js'
import bin from './bin.js'
import dropNA from './dropNA.js'
import reproject from './reproject.js'
import transform from './transform.js'
import cumsum from './cumsum.js'
import stack from './stack.js'

const transformations = {
  filter,
  select: produce(select),
  arrange: produce(arrange),
  rename: produce(rename),
  mutate: produce(mutate),
  transmute: produce(transmute),
  summarise,
  mutarise,
  groupBy,
  bin,
  dropNA,
  reproject,
  transform: produce(transform),
  cumsum: produce(cumsum),
  stack: produce(stack)
}

export default transformations

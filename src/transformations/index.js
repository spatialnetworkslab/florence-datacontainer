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
import rowCumsum from './rowCumsum.js'
import pivotLonger from './pivotLonger.js'
import pivotWider from './pivotWider.js'

const transformations = {
  filter,
  select,
  arrange,
  rename,
  mutate,
  transmute,
  summarise,
  mutarise,
  groupBy,
  bin,
  dropNA,
  reproject,
  transform,
  cumsum,
  rowCumsum,
  pivotLonger,
  pivotWider
}

export default transformations

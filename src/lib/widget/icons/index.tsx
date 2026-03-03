import addNote from './addNote'
import addSymbol from './addSymbol'
import advancedView from './advancedView'
import alertBell from './alertBell'
import arrowRight from './arrowRight'
import bell from './bell'
import bookmark from './bookmark'
import calendar from './calendar'
import caretDown from './caretDown'
import chats from './chats'
import chevronDown from './chevronDown'
import chevronRight from './chevronRight'
import chevronRightBold from './chevronRightBold'
import chevronTiny from './chevronTiny'
import chevronUp from './chevronUp'
import circleDot from './circleDot'
import close from './close'
import community from './community'
import compare from './compare'
import detach from './detach'
import diamond from './diamond'
import drag from './drag'
import dragHandle from './dragHandle'
import editPointer from './editPointer'
import expandCorners from './expandCorners'
import folder from './folder'
import goToDate from './goToDate'
import help from './help'
import indicators from './indicators'
import layers from './layers'
import maximize from './maximize'
import mentions from './mentions'
import metricsGrid from './metricsGrid'
import minus from './minus'
import moreApps from './moreApps'
import moreHorizontal from './moreHorizontal'
import newChat from './newChat'
import notifications from './notifications'
import objectTree from './objectTree'
import orders from './orders'
import pineScript from './pineScript'
import plus from './plus'
import popupMenu from './popupMenu'
import priceTag from './priceTag'
import refresh from './refresh'
import rename from './rename'
import screener from './screener'
import search from './search'
import settingsDotsBtn from './settingsDotsBtn'
import sidebarHandle from './sidebarHandle'
import star from './star'
import templates from './templates'
import trashSmall from './trashSmall'
import widgetTabs from './widgetTabs'
import zoom from './zoom'

// Coinray-chart-ui icon names (renamed from TradingView names)
import copy from './copy'
import edit from './edit'
import fill from './fill'
import hide from './hide'
import layerStack from './layerStack'
import line from './line'
import lineDashed from './lineDashed'
import lineDotted from './lineDotted'
import locked from './locked'
import more from './more'
import settings from './settings'
import show from './show'
import showSmall from './showSmall'
import text from './text'

// Drawing-bar icons aliased to coinray names
import lockAll from '../drawing-bar/icons/lockAll'
import trash from '../drawing-bar/icons/trash'
const unlocked = lockAll   // lockAll SVG is the unlocked padlock

export const mapping: Record<string, () => any> = {
  addNote,
  addSymbol,
  advancedView,
  alertBell,
  arrowRight,
  bell,
  bookmark,
  calendar,
  caretDown,
  chats,
  chevronDown,
  chevronRight,
  chevronRightBold,
  chevronTiny,
  chevronUp,
  circleDot,
  close,
  community,
  compare,
  detach,
  diamond,
  drag,
  dragHandle,
  editPointer,
  expandCorners,
  folder,
  goToDate,
  help,
  indicators,
  layers,
  maximize,
  mentions,
  metricsGrid,
  minus,
  moreApps,
  moreHorizontal,
  newChat,
  notifications,
  objectTree,
  orders,
  pineScript,
  plus,
  popupMenu,
  priceTag,
  refresh,
  rename,
  screener,
  search,
  settingsDotsBtn,
  sidebarHandle,
  star,
  templates,
  trashSmall,
  widgetTabs,
  zoom,

  // Coinray-chart-ui icon names
  copy,
  edit,
  fill,
  hide,
  layerStack,
  line,
  lineDashed,
  lineDotted,
  locked,
  more,
  settings,
  show,
  showSmall,
  text,

  // Drawing-bar icons with coinray aliases
  lockAll,
  unlocked,
  trash,
}

interface IconProps {
  name: string
  className?: string
}

export const Icon = ({ name, className }: IconProps) => {
  const IconFn = mapping[name]
  if (!IconFn) return null
  const el = IconFn()
  if (className && el) {
    return <span className={className}>{el}</span>
  }
  return el
}

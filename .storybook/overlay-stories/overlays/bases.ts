import type {Chart, Nullable, Overlay} from "@superchart"

export interface Base {
  id: number
  price: number
  formedAt: string
  crackedAt: string | null
  respectedAt: string | null
  [key: string]: unknown
}

export interface BaseColors {
  notCracked: string
  cracked: string
  respected: string
}

export function getBaseColor(base: Base, colors: BaseColors): string {
  if (base.respectedAt) return colors.respected
  if (base.crackedAt) return colors.cracked
  return colors.notCracked
}

function toMs(iso: string): number {
  return new Date(iso).getTime()
}

function applyProperties(chart: Chart, id: string, props: Record<string, unknown>): void {
  const overlay = chart.getOverlays({id})[0] as Overlay & {setProperties?: (p: Record<string, unknown>, id: string) => void}
  if (overlay?.setProperties) overlay.setProperties(props, id)
}

function createSegment(
  chart: Chart,
  startMs: number,
  endMs: number,
  price: number,
  color: string,
  size: number,
  style: "solid" | "dashed" = "solid",
): Nullable<string> {
  const id = chart.createOverlay({
    name: "segment",
    points: [
      {timestamp: startMs, value: price},
      {timestamp: endMs, value: price},
    ],
    lock: true,
  }) as Nullable<string>
  if (id) applyProperties(chart, id, {lineColor: color, lineWidth: size, lineStyle: style})
  return id
}

export function createBaseLine(
  chart: Chart,
  base: Base,
  nextBaseFormedAt: number | null,
  colors: BaseColors,
): string[] {
  const ids: string[] = []
  const startMs = toMs(base.formedAt)
  const color = getBaseColor(base, colors)

  const endMs = base.crackedAt
    ? toMs(base.crackedAt)
    : (nextBaseFormedAt ?? Date.now())

  const id = createSegment(chart, startMs, endMs, base.price, color, 2)
  if (id) ids.push(id)

  if (base.respectedAt && base.crackedAt) {
    const contId = createSegment(
      chart, toMs(base.crackedAt), toMs(base.respectedAt),
      base.price, colors.notCracked, 1,
    )
    if (contId) ids.push(contId)
  }

  return ids
}

export function createSelectedBase(
  chart: Chart,
  base: Base,
  colors: BaseColors,
  showBox: boolean,
  medianDrop: number,
): string[] {
  const ids: string[] = []
  const startMs = toMs(base.formedAt)
  const endMs = base.respectedAt ? toMs(base.respectedAt) : Date.now()
  const color = getBaseColor(base, colors)

  const id = createSegment(chart, startMs, endMs, base.price, color, 2)
  if (id) ids.push(id)

  if (showBox) {
    const dropPrice = base.price * (100 + medianDrop) / 100
    const boxId = chart.createOverlay({
      name: "rect",
      points: [
        {timestamp: startMs, value: base.price},
        {timestamp: endMs, value: dropPrice},
      ],
      lock: true,
    }) as Nullable<string>
    if (boxId) {
      applyProperties(chart, boxId, {style: "fill", backgroundColor: color + "33", borderWidth: 0})
      ids.push(boxId)
    }

    const bottomId = createSegment(chart, startMs, endMs, dropPrice, color, 1)
    if (bottomId) ids.push(bottomId)

    const midPrice = (base.price + dropPrice) / 2
    const midId = createSegment(chart, startMs, endMs, midPrice, color, 1, "dashed")
    if (midId) ids.push(midId)
  }

  return ids
}

export function removeBase(chart: Chart, ids: string[]): void {
  for (const id of ids) {
    chart.removeOverlay({id})
  }
}

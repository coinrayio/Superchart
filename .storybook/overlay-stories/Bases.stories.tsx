import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "@superchart"
import type {VisibleTimeRange} from "../../src/lib"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {createBaseLine, createSelectedBase, removeBase} from "./overlays/bases"
import type {Base, BaseColors} from "./overlays/bases"

const BASES_BY_SYMBOL: Record<string, Base[]> = {
  BINA_USDT_BTC: [
    {
      id: 277804362,
      formedAt: "2026-01-31T04:00:00.000Z",
      price: 70140,
      crackedAt: "2026-02-05T11:00:00.000Z",
      respectedAt: "2026-02-06T16:00:00.000Z",
    },
    {
      id: 277995062,
      formedAt: "2026-02-05T10:00:00.000Z",
      price: 60000,
      crackedAt: null,
      respectedAt: null,
    },
    {
      id: 279863353,
      formedAt: "2026-02-08T20:00:00.000Z",
      price: 62510.28,
      crackedAt: null,
      respectedAt: null,
    },
    {
      id: 280702964,
      formedAt: "2026-03-02T12:00:00.000Z",
      price: 65259.21,
      crackedAt: null,
      respectedAt: null,
    },
    {
      id: 280934343,
      formedAt: "2026-03-11T05:00:00.000Z",
      price: 68977.91,
      crackedAt: null,
      respectedAt: null,
    },
  ],
  BYBIF_USDT_KGEN: [
    {
      "id": 281144667,
      "formedAt": "2026-01-30T22:00:00.000Z",
      "price": 0.24547,
      "lowestPrice": 0.15682,
      "drop": "-36.114392797490528374139406037398",
      "isLowest": false,
      "currentDrop": -23.705544465718827,
      "crackedAt": "2026-01-31T11:00:00.000Z",
      "respectedAt": null,
      "coinraySymbol": "BYBIF_USDT_KGEN",
      "baseId": 281144667
    },
    {
      "id": 277869308,
      "formedAt": "2026-01-31T08:00:00.000Z",
      "price": 0.20109,
      "lowestPrice": 0.15682,
      "drop": "-22.015018151076632353672484956984",
      "isLowest": false,
      "currentDrop": -6.867571734049431,
      "crackedAt": "2026-02-05T10:00:00.000Z",
      "respectedAt": "2026-03-03T04:00:00.000Z",
      "coinraySymbol": "BYBIF_USDT_KGEN",
      "baseId": 277869308
    },
    {
      "id": 278008642,
      "formedAt": "2026-02-05T07:00:00.000Z",
      "price": 0.15682,
      "lowestPrice": 0.15682,
      "drop": "0.0",
      "isLowest": false,
      "currentDrop": 19.423542915444457,
      "crackedAt": null,
      "respectedAt": null,
      "coinraySymbol": "BYBIF_USDT_KGEN",
      "baseId": 278008642
    },
    {
      "id": 278421318,
      "formedAt": "2026-02-08T00:00:00.000Z",
      "price": 0.16078,
      "lowestPrice": 0.16488,
      "drop": "2.550068416469710162955591491479",
      "isLowest": false,
      "currentDrop": 16.48214952108471,
      "crackedAt": null,
      "respectedAt": null,
      "coinraySymbol": "BYBIF_USDT_KGEN",
      "baseId": 278421318
    },
    {
      "id": 279000757,
      "formedAt": "2026-02-13T22:00:00.000Z",
      "price": 0.16511,
      "lowestPrice": 0.1734,
      "drop": "5.0208951608018896493246926291563",
      "isLowest": false,
      "currentDrop": 13.42741202834474,
      "crackedAt": null,
      "respectedAt": null,
      "coinraySymbol": "BYBIF_USDT_KGEN",
      "baseId": 279000757
    },
    {
      "id": 279150596,
      "formedAt": "2026-02-20T04:00:00.000Z",
      "price": 0.1808,
      "lowestPrice": 0.17108,
      "drop": "-5.3761061946902654867256637168142",
      "isLowest": false,
      "currentDrop": 3.584070796460177,
      "crackedAt": "2026-02-20T12:00:00.000Z",
      "respectedAt": "2026-02-21T11:00:00.000Z",
      "coinraySymbol": "BYBIF_USDT_KGEN",
      "baseId": 279150596
    },
    {
      "id": 279686073,
      "formedAt": "2026-02-26T10:00:00.000Z",
      "price": 0.18196,
      "lowestPrice": 0.1709,
      "drop": "-6.07825895801275005495713343592",
      "isLowest": false,
      "currentDrop": 2.923719498790943,
      "crackedAt": "2026-02-27T14:00:00.000Z",
      "respectedAt": "2026-02-28T11:00:00.000Z",
      "coinraySymbol": "BYBIF_USDT_KGEN",
      "baseId": 279686073
    },
    {
      "id": 279834314,
      "formedAt": "2026-02-21T01:00:00.000Z",
      "price": 0.16921,
      "lowestPrice": 0.17108,
      "drop": "1.105135630281898232964954789906",
      "isLowest": false,
      "currentDrop": 10.679037881921872,
      "crackedAt": null,
      "respectedAt": null,
      "coinraySymbol": "BYBIF_USDT_KGEN",
      "baseId": 279834314
    },
    {
      "id": 280001234,
      "formedAt": "2026-03-01T16:00:00.000Z",
      "price": 0.18212,
      "lowestPrice": 0.18297,
      "drop": "0.46672523610806061937184274104986",
      "isLowest": false,
      "currentDrop": 2.833296727432462,
      "crackedAt": null,
      "respectedAt": null,
      "coinraySymbol": "BYBIF_USDT_KGEN",
      "baseId": 280001234
    },
    {
      "id": 281021461,
      "formedAt": "2026-03-03T17:00:00.000Z",
      "price": 0.18966,
      "lowestPrice": 0.18212,
      "drop": "-3.975535168195718654434250764526",
      "isLowest": false,
      "currentDrop": -1.2548771485816725,
      "crackedAt": "2026-03-13T02:00:00.000Z",
      "respectedAt": null,
      "coinraySymbol": "BYBIF_USDT_KGEN",
      "baseId": 281021461
    }
  ],
  BYBIF_USDT_SXP: [
    {
      "id": 281134276,
      "formedAt": "2026-01-30T23:00:00.000Z",
      "price": 0.03288,
      "lowestPrice": 0.03177,
      "drop": "-3.3759124087591240875912408759124",
      "isLowest": true,
      "currentDrop": -56.660583941605836,
      "crackedAt": "2026-02-02T03:00:00.000Z",
      "respectedAt": "2026-02-02T07:00:00.000Z",
      "coinraySymbol": "BYBIF_USDT_SXP",
      "baseId": 281134276
    },
    {
      "id": 277909362,
      "formedAt": "2026-02-02T02:00:00.000Z",
      "price": 0.03083,
      "lowestPrice": 0.02982,
      "drop": "-3.2760298410638987998702562439183",
      "isLowest": true,
      "currentDrop": -53.778786895880636,
      "crackedAt": "2026-02-05T03:00:00.000Z",
      "respectedAt": "2026-02-05T05:00:00.000Z",
      "coinraySymbol": "BYBIF_USDT_SXP",
      "baseId": 277909362
    },
    {
      "id": 277921940,
      "formedAt": "2026-02-05T03:00:00.000Z",
      "price": 0.02982,
      "lowestPrice": 0.01222,
      "drop": "-59.020791415157612340710932260228",
      "isLowest": false,
      "currentDrop": -52.21327967806841,
      "crackedAt": "2026-02-05T09:00:00.000Z",
      "respectedAt": null,
      "coinraySymbol": "BYBIF_USDT_SXP",
      "baseId": 277921940
    },
    {
      "id": 278291182,
      "formedAt": "2026-02-09T11:00:00.000Z",
      "price": 0.02566,
      "lowestPrice": 0.0225,
      "drop": "-12.314886983632112236944660950896",
      "isLowest": true,
      "currentDrop": -44.46609508963367,
      "crackedAt": "2026-02-10T07:00:00.000Z",
      "respectedAt": "2026-02-10T11:00:00.000Z",
      "coinraySymbol": "BYBIF_USDT_SXP",
      "baseId": 278291182
    },
    {
      "id": 278999927,
      "formedAt": "2026-02-05T06:00:00.000Z",
      "price": 0.02108,
      "lowestPrice": 0.02014,
      "drop": "-4.4592030360531309297912713472486",
      "isLowest": true,
      "currentDrop": -32.400379506641364,
      "crackedAt": "2026-02-18T18:00:00.000Z",
      "respectedAt": "2026-02-19T00:00:00.000Z",
      "coinraySymbol": "BYBIF_USDT_SXP",
      "baseId": 278999927
    },
    {
      "id": 279047156,
      "formedAt": "2026-02-18T17:00:00.000Z",
      "price": 0.02014,
      "lowestPrice": 0.01939,
      "drop": "-3.7239324726911618669314796425025",
      "isLowest": true,
      "currentDrop": -29.245283018867923,
      "crackedAt": "2026-02-19T02:00:00.000Z",
      "respectedAt": "2026-02-19T19:00:00.000Z",
      "coinraySymbol": "BYBIF_USDT_SXP",
      "baseId": 279047156
    },
    {
      "id": 279166658,
      "formedAt": "2026-02-19T02:00:00.000Z",
      "price": 0.01912,
      "lowestPrice": 0.01846,
      "drop": "-3.4518828451882845188284518828452",
      "isLowest": true,
      "currentDrop": -25.47071129707113,
      "crackedAt": "2026-02-24T02:00:00.000Z",
      "respectedAt": "2026-02-24T17:00:00.000Z",
      "coinraySymbol": "BYBIF_USDT_SXP",
      "baseId": 279166658
    },
    {
      "id": 279337548,
      "formedAt": "2026-02-22T23:00:00.000Z",
      "price": 0.01993,
      "lowestPrice": 0.01846,
      "drop": "-7.3758153537380832915203211239338",
      "isLowest": true,
      "currentDrop": -28.499749121926744,
      "crackedAt": "2026-02-24T01:00:00.000Z",
      "respectedAt": "2026-02-24T20:00:00.000Z",
      "coinraySymbol": "BYBIF_USDT_SXP",
      "baseId": 279337548
    },
    {
      "id": 279611023,
      "formedAt": "2026-02-25T04:00:00.000Z",
      "price": 0.02188,
      "lowestPrice": 0.02095,
      "drop": "-4.2504570383912248628884826325411",
      "isLowest": true,
      "currentDrop": -34.87202925045704,
      "crackedAt": "2026-02-25T23:00:00.000Z",
      "respectedAt": "2026-02-26T07:00:00.000Z",
      "coinraySymbol": "BYBIF_USDT_SXP",
      "baseId": 279611023
    },
    {
      "id": 279821962,
      "formedAt": "2026-02-27T10:00:00.000Z",
      "price": 0.02038,
      "lowestPrice": 0.01914,
      "drop": "-6.0843964671246319921491658488714",
      "isLowest": true,
      "currentDrop": -30.078508341511284,
      "crackedAt": "2026-02-28T06:00:00.000Z",
      "respectedAt": "2026-03-01T01:00:00.000Z",
      "coinraySymbol": "BYBIF_USDT_SXP",
      "baseId": 279821962
    },
    {
      "id": 280930782,
      "formedAt": "2026-02-28T05:00:00.000Z",
      "price": 0.01914,
      "lowestPrice": 0.01222,
      "drop": "-36.154649947753396029258098223615",
      "isLowest": false,
      "currentDrop": -25.54858934169279,
      "crackedAt": "2026-03-12T00:00:00.000Z",
      "respectedAt": null,
      "coinraySymbol": "BYBIF_USDT_SXP",
      "baseId": 280930782
    },
    {
      "id": 281019340,
      "formedAt": "2026-03-12T00:00:00.000Z",
      "price": 0.01553,
      "lowestPrice": 0.01222,
      "drop": "-21.313586606567933032839665164198",
      "isLowest": false,
      "currentDrop": -8.24211204121056,
      "crackedAt": "2026-03-13T00:00:00.000Z",
      "respectedAt": null,
      "coinraySymbol": "BYBIF_USDT_SXP",
      "baseId": 281019340
    },
    {
      "id": 281131843,
      "formedAt": "2026-03-13T00:00:00.000Z",
      "price": 0.01222,
      "lowestPrice": 0.01222,
      "drop": "0.0",
      "isLowest": false,
      "currentDrop": 16.612111292962357,
      "crackedAt": null,
      "respectedAt": null,
      "coinraySymbol": "BYBIF_USDT_SXP",
      "baseId": 281131843
    }
  ]
}

const SYMBOLS = Object.keys(BASES_BY_SYMBOL)

function getSortedBases(symbol: string): Base[] {
  const bases = BASES_BY_SYMBOL[symbol] ?? []
  return [...bases].sort((a, b) =>
    new Date(a.formedAt).getTime() - new Date(b.formedAt).getTime()
  )
}

interface BasesArgs {
  showBases: boolean
  showBox: boolean
  showRespected: boolean
  showNotRespected: boolean
  showNotCracked: boolean
  medianDrop: number
  notCrackedColor: string
  crackedColor: string
  respectedColor: string
  symbol: string
}

function toSeconds(iso: string): number {
  return new Date(iso).getTime() / 1000
}

function filterBases(
  bases: Base[],
  showRespected: boolean,
  showNotRespected: boolean,
  showNotCracked: boolean,
  visibleRange: VisibleTimeRange | null,
): Base[] {
  return bases.filter((base) => {
    if (!showRespected && base.respectedAt) return false
    if (!showNotRespected && !base.respectedAt) return false
    if (!showNotCracked && !base.crackedAt) return false
    if (visibleRange) {
      if (toSeconds(base.formedAt) >= visibleRange.to) return false
      if (base.respectedAt && toSeconds(base.respectedAt) < visibleRange.from) return false
    }
    return true
  })
}

function BasesDemo({
  showBases, showBox, showRespected, showNotRespected, showNotCracked,
  medianDrop, notCrackedColor, crackedColor, respectedColor, symbol,
}: BasesArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const [visibleRange, setVisibleRange] = useState<VisibleTimeRange | null>(null)
  const [selectedBaseId, setSelectedBaseId] = useState("none")
  const idsRef = useRef<Record<number, string[]>>({})

  const onChart = useCallback((c: Chart) => setChart(c), [])
  const onVisibleRangeChange = useCallback((r: VisibleTimeRange) => setVisibleRange(r), [])

  const clearAll = (chart: Chart) => {
    for (const ids of Object.values(idsRef.current)) {
      removeBase(chart, ids)
    }
    idsRef.current = {}
  }

  const drawAll = (chart: Chart) => {
    const colors: BaseColors = {
      notCracked: notCrackedColor,
      cracked: crackedColor,
      respected: respectedColor,
    }

    const filtered = filterBases(getSortedBases(symbol), showRespected, showNotRespected, showNotCracked, visibleRange)
    const selectedId = selectedBaseId !== "none" ? Number(selectedBaseId) : null

    for (let i = 0; i < filtered.length; i++) {
      const base = filtered[i]

      if (base.id === selectedId) {
        idsRef.current[base.id] = createSelectedBase(chart, base, colors, showBox, medianDrop)
      } else {
        const nextBase = filtered[i + 1]
        const nextFormedAt = nextBase ? new Date(nextBase.formedAt).getTime() : null
        idsRef.current[base.id] = createBaseLine(chart, base, nextFormedAt, colors)
      }
    }
  }

  useEffect(() => {
    if (!chart) return

    clearAll(chart)
    if (!showBases) return

    const dataList = chart.getDataList()
    if (dataList.length) {
      drawAll(chart)
    } else {
      const timer = setTimeout(() => drawAll(chart), 500)
      return () => clearTimeout(timer)
    }

    return () => clearAll(chart)
  }, [chart, visibleRange, showBases, showBox, showRespected, showNotRespected, showNotCracked,
    selectedBaseId, medianDrop, notCrackedColor, crackedColor, respectedColor, symbol])

  const baseIds = (BASES_BY_SYMBOL[symbol] ?? []).map(b => String(b.id))

  return (
    <div style={{position: "relative", width: "100%", height: "100vh"}}>
      <div style={{
        position: "absolute", top: 48, right: 12, zIndex: 10,
        background: "rgba(0,0,0,0.85)", color: "#eee", padding: "10px 14px",
        borderRadius: 6, fontFamily: "monospace", fontSize: 12, lineHeight: 2,
        pointerEvents: "auto",
      }}>
        <div>
          selected base:{" "}
          <select
            style={{
              background: "#333", color: "#eee", border: "1px solid #555",
              borderRadius: 3, padding: "2px 4px", fontFamily: "monospace", fontSize: 12,
              cursor: "pointer",
            }}
            value={baseIds.includes(selectedBaseId) ? selectedBaseId : "none"}
            onChange={e => setSelectedBaseId(e.target.value)}
          >
            <option value="none">None</option>
            {baseIds.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </div>
      </div>
      <SuperchartCanvas symbol={symbol} onChart={onChart} onVisibleRangeChange={onVisibleRangeChange} />
    </div>
  )
}

const meta: Meta<typeof BasesDemo> = {
  title: "Overlays/Bases",
  component: BasesDemo,
  argTypes: {
    showBases:        {control: "boolean", description: "Master toggle", table: {category: "Visibility"}},
    showBox:          {control: "boolean", description: "Show selected base background box", table: {category: "Visibility"}},
    showRespected:    {control: "boolean", description: "Show respected bases", table: {category: "Visibility"}},
    showNotRespected: {control: "boolean", description: "Show not-respected bases", table: {category: "Visibility"}},
    showNotCracked:   {control: "boolean", description: "Show not-cracked bases", table: {category: "Visibility"}},
    medianDrop:       {control: {type: "number", min: -10, max: 0, step: 0.5},
                       description: "Median drop % for box height", table: {category: "Selection"}},
    notCrackedColor:  {control: "color", description: "Not cracked base color", table: {category: "Colors"}},
    crackedColor:     {control: "color", description: "Cracked base color", table: {category: "Colors"}},
    respectedColor:   {control: "color", description: "Respected base color", table: {category: "Colors"}},
    symbol:           {control: "select", options: SYMBOLS, table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof BasesDemo>

export const Default: Story = {
  args: {
    showBases: true,
    showBox: true,
    showRespected: true,
    showNotRespected: true,
    showNotCracked: true,
    medianDrop: -3,
    notCrackedColor: "#8B8D92",
    crackedColor: "#37CB95",
    respectedColor: "#F15959",
    symbol: "BINA_USDT_BTC",
  },
}

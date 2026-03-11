import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "klinecharts"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {useCurrentPrice} from "../helpers/useCurrentPrice"
import {createThreeWaves, createFiveWaves, createEightWaves, createAnyWaves, removeWave} from "./overlays/wave-patterns"

type WaveType = "threeWaves" | "fiveWaves" | "eightWaves" | "anyWaves"

interface WaveArgs {
  waveType: WaveType
  symbol: string
}

function makeZigzag(dataList: any[], count: number, startIdx: number): Array<{timestamp: number, value: number}> {
  const points = []
  const step = Math.max(3, Math.floor(30 / count))
  for (let i = 0; i < count; i++) {
    const idx = startIdx + i * step
    if (idx >= dataList.length) break
    const bar = dataList[idx]
    // Alternate high/low for zigzag pattern
    const value = i % 2 === 0 ? bar.high : bar.low
    points.push({timestamp: bar.timestamp, value})
  }
  return points
}

function WavePatternsDemo({waveType, symbol}: WaveArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const idsRef = useRef<string[]>([])
  const currentPrice = useCurrentPrice(chart)

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const clear = () => {
    if (!chart) return
    idsRef.current.forEach(id => removeWave(chart, id))
    idsRef.current = []
  }

  useEffect(() => {
    if (!chart || !currentPrice) return
    clear()

    const dataList = chart.getDataList()
    if (dataList.length < 50) return

    const startIdx = dataList.length - 45

    let id: string | null = null

    switch (waveType) {
      case "threeWaves": {
        const points = makeZigzag(dataList, 4, startIdx)
        if (points.length === 4) id = createThreeWaves(chart, points)
        break
      }
      case "fiveWaves": {
        const points = makeZigzag(dataList, 6, startIdx)
        if (points.length === 6) id = createFiveWaves(chart, points)
        break
      }
      case "eightWaves": {
        const points = makeZigzag(dataList, 9, startIdx)
        if (points.length === 9) id = createEightWaves(chart, points)
        break
      }
      case "anyWaves": {
        const points = makeZigzag(dataList, 7, startIdx)
        if (points.length >= 3) id = createAnyWaves(chart, points)
        break
      }
    }

    if (id) idsRef.current.push(id)
    return clear
  }, [chart, currentPrice, waveType])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof WavePatternsDemo> = {
  title: "Overlays/Waves",
  component: WavePatternsDemo,
  argTypes: {
    waveType: {
      control: "select",
      options: ["threeWaves", "fiveWaves", "eightWaves", "anyWaves"],
      table: {category: "Settings"},
    },
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof WavePatternsDemo>

export const ThreeWaves: Story = {
  args: {waveType: "threeWaves", symbol: "BINA_USDT_BTC"},
}

export const FiveWaves: Story = {
  args: {waveType: "fiveWaves", symbol: "BINA_USDT_BTC"},
}

export const EightWaves: Story = {
  args: {waveType: "eightWaves", symbol: "BINA_USDT_BTC"},
}

export const AnyWaves: Story = {
  args: {waveType: "anyWaves", symbol: "BINA_USDT_BTC"},
}

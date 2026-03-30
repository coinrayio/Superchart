import {useEffect, useState} from "react"
import type {Chart} from "@superchart/index"

/** Returns the last close price from the chart's data list. Updates on data changes. */
export function useCurrentPrice(chart: Chart | null): number | null {
  const [price, setPrice] = useState<number | null>(null)

  useEffect(() => {
    if (!chart) return

    const update = () => {
      const dataList = chart.getDataList()
      if (dataList.length) {
        setPrice(dataList[dataList.length - 1].close)
      }
    }

    update()
    // Re-check when new bars arrive
    const id = setInterval(update, 2000)
    return () => clearInterval(id)
  }, [chart])

  return price
}

import { useEffect, useRef } from 'react'
import { Superchart, createDataLoader } from '@superchart/index'
import { CoinrayDatafeed } from './datafeed/CoinrayDatafeed'
import { WebSocketScriptProvider } from './script/WebSocketScriptProvider'
import { WebSocketIndicatorProvider } from './indicator/WebSocketIndicatorProvider'

const SCRIPT_SERVER_URL = import.meta.env.VITE_SCRIPT_SERVER_URL || 'ws://localhost:8080'
const COINRAY_TOKEN = import.meta.env.VITE_COINRAY_TOKEN || ''

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Superchart | null>(null)

  useEffect(() => {
    if (!containerRef.current || !COINRAY_TOKEN) {
      if (!COINRAY_TOKEN) {
        console.error('VITE_COINRAY_TOKEN environment variable is required')
      }
      return
    }

    // Create Coinray datafeed
    const datafeed = new CoinrayDatafeed(COINRAY_TOKEN)

    // Create data loader
    const dataLoader = createDataLoader(datafeed)

    // Create script provider (for user-written scripts via the editor)
    const scriptProvider = new WebSocketScriptProvider(SCRIPT_SERVER_URL)

    // Create indicator provider (for server-side preset indicators)
    const indicatorProvider = new WebSocketIndicatorProvider(SCRIPT_SERVER_URL)

    // When the chart loads a historical bar range, ask both providers to compute
    // indicator data for those same older candles
    dataLoader.setOnBarsLoaded((fromMs) => {
      scriptProvider.loadHistoryBefore(fromMs)
      indicatorProvider.loadHistoryBefore(fromMs)
    })

    // Initialize Superchart
    const chart = new Superchart({
      container: containerRef.current,
      symbol: {
        ticker: 'BINA_USDT_BTC',
        pricePrecision: 2,
        volumePrecision: 0,
      },
      period: {
        type: 'hour',
        span: 1,
        text: '1H',
      },
      dataLoader,
      scriptProvider,
      indicatorProvider,
      locale: 'en-US',
      theme: 'dark',
      timezone: 'Etc/UTC',
      showVolume: true,
      drawingBarVisible: true,
    })

    chartRef.current = chart

    // Sample toolbar button — alerts the current symbol
    chart.createButton({
      text: 'Alert',
      tooltip: 'Create a price alert',
      icon: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a5.5 5.5 0 0 0-5.5 5.5v2.086l-.707.707A1 1 0 0 0 2.5 11H5a3 3 0 0 0 6 0h2.5a1 1 0 0 0 .707-1.707l-.707-.707V6.5A5.5 5.5 0 0 0 8 1zm0 13a2 2 0 0 1-1.995-1.85L6 12h4l-.005.15A2 2 0 0 1 8 14z"/></svg>',
      onClick: () => alert(`Price alert set for ${chart.getSymbol().ticker}`),
    })

    // Sample toolbar dropdown — switch chart type
    chart.createDropdown({
      text: 'Chart Type',
      tooltip: 'Change chart style',
      items: [
        {
          text: 'Candlestick',
          onClick: () => chart.getChart()?.setStyles({ candle: { type: 'candle_solid' as never } }),
        },
        {
          text: 'Hollow Candle',
          onClick: () => chart.getChart()?.setStyles({ candle: { type: 'candle_stroke' as never } }),
        },
        {
          text: 'Heikin-Ashi',
          onClick: () => chart.getChart()?.setStyles({ candle: { type: 'heikin_ashi' as never } }),
        },
        { type: 'separator' },
        {
          text: 'Line',
          onClick: () => chart.getChart()?.setStyles({ candle: { type: 'area' as never } }),
        },
      ],
    })

    // Cleanup on unmount
    return () => {
      chart.dispose()
      datafeed.dispose()
      scriptProvider.dispose()
      indicatorProvider.dispose()
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {!COINRAY_TOKEN && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '20px',
          background: '#ff4444',
          color: 'white',
          borderRadius: '8px',
          zIndex: 1000,
        }}>
          <h2>Configuration Error</h2>
          <p>Please set VITE_COINRAY_TOKEN in your .env file</p>
          <pre style={{ background: '#333', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
            VITE_COINRAY_TOKEN=your_token_here{'\n'}
            VITE_SCRIPT_SERVER_URL=ws://localhost:8080
          </pre>
        </div>
      )}

      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

export default App

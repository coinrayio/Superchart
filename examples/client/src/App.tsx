import { useEffect, useRef } from 'react'
import { Superchart, createDataLoader } from '@superchart/index'
import { CoinrayDatafeed } from './datafeed/CoinrayDatafeed'
import { WebSocketScriptProvider } from './script/WebSocketScriptProvider'

const SCRIPT_SERVER_URL = import.meta.env.VITE_SCRIPT_SERVER_URL || 'ws://localhost:8080'
const COINRAY_TOKEN = import.meta.env.VITE_COINRAY_TOKEN || ''

const EXAMPLE_SCRIPTS = [
  {
    name: 'Simple RSI',
    description: 'RSI indicator with overbought/oversold levels',
    code: `//@version=5
indicator("My RSI", overlay=false)

length = input(14, title="RSI Length")
rsiValue = rsi(close, length)

plot(rsiValue, title="RSI", color=color.purple)
hline(70, title="Overbought", color=color.red, linestyle=dashed)
hline(50, title="Midline", color=color.gray, linestyle=dotted)
hline(30, title="Oversold", color=color.green, linestyle=dashed)`,
  },
  {
    name: 'MACD',
    description: 'MACD indicator with histogram',
    code: `//@version=5
indicator("My MACD", overlay=false)

fastLength = input(12, title="Fast Length")
slowLength = input(26, title="Slow Length")
signalLength = input(9, title="Signal Length")

result = macd(close, fastLength, slowLength, signalLength)
macdLine = result.macd
signalLine = result.signal

plot(macdLine, title="MACD", color=color.blue)
plot(signalLine, title="Signal", color=color.orange)
hline(0, title="Zero", color=color.gray)`,
  },
  {
    name: 'Moving Averages',
    description: 'SMA and EMA crossover system',
    code: `//@version=5
indicator("Moving Averages", overlay=true)

smaLength = input(20, title="SMA Length")
emaLength = input(50, title="EMA Length")

smaValue = sma(close, smaLength)
emaValue = ema(close, emaLength)

plot(smaValue, title="SMA", color=color.blue)
plot(emaValue, title="EMA", color=color.orange)`,
  },
  {
    name: 'Bollinger Bands',
    description: 'Bollinger Bands with standard deviation',
    code: `//@version=5
indicator("Bollinger Bands", overlay=true)

length = input(20, title="Length")
mult = input(2.0, title="StdDev")

result = bb(close, length, mult)
upper = result.upper
middle = result.middle
lower = result.lower

plot(upper, title="Upper Band", color=color.red)
plot(middle, title="Middle Band", color=color.blue)
plot(lower, title="Lower Band", color=color.green)`,
  },
]

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

    // Create script provider
    const scriptProvider = new WebSocketScriptProvider(SCRIPT_SERVER_URL)

    // Initialize Superchart with script examples
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
      locale: 'en-US',
      theme: 'dark',
      timezone: 'Etc/UTC',
      showVolume: true,
      drawingBarVisible: true,
    })

    chartRef.current = chart

    // Log example scripts for demonstration
    console.log('📜 Example Pine Scripts available:')
    EXAMPLE_SCRIPTS.forEach((script, i) => {
      console.log(`  ${i + 1}. ${script.name} - ${script.description}`)
    })
    console.log('\nUse the script editor in the chart UI to load and execute these examples!')

    // Cleanup on unmount
    return () => {
      chart.dispose()
      datafeed.dispose()
      scriptProvider.dispose()
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

      {/* Info overlay showing available examples */}
      {/* {COINRAY_TOKEN && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          padding: '15px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          borderRadius: '8px',
          zIndex: 100,
          maxWidth: '300px',
          fontSize: '12px',
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>📜 Example Scripts</h3>
          <p style={{ margin: '0 0 10px 0', opacity: 0.8 }}>
            Open the script editor to load these examples:
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {EXAMPLE_SCRIPTS.map(script => (
              <li key={script.name} style={{ marginBottom: '5px' }}>
                <strong>{script.name}</strong>
                <br />
                <span style={{ opacity: 0.7, fontSize: '11px' }}>{script.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )} */}

      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

export default App

// Export examples so they can be imported by other components if needed
export { EXAMPLE_SCRIPTS }

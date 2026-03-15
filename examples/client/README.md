# Superchart Script Client

Demo client application that connects to the script execution server and displays real-time indicator data.

## Features

- ✍️ **Pine Script Editor**: Write and edit Pine Script code
- 🔍 **Compile & Execute**: Validate and run scripts on live data
- 📊 **Real-time Updates**: See indicator values update in real-time
- 📚 **Example Scripts**: Pre-loaded examples to get started quickly
- 🔌 **WebSocket Connection**: Persistent connection to the execution server

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your configuration to `.env`:
```
VITE_COINRAY_TOKEN=your_token_here
VITE_SCRIPT_SERVER_URL=ws://localhost:8080
```

## Running

### Development:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production:
```bash
npm run build
npm run preview
```

## Usage

### 1. Start the Script Server

Make sure the script execution server is running:
```bash
cd ../server
npm run dev
```

### 2. Open the Client

The client will automatically connect to the script server.

### 3. Write or Select a Script

Use the Pine Script editor to write your own indicator, or click on one of the example scripts.

### 4. Execute

Click **Execute** to run the script on live market data. The indicator data will be displayed in real-time.

### 5. Stop

Click **Stop** to terminate the script execution.

## Example Scripts

### Simple RSI
```pine
//@version=5
indicator("My RSI", overlay=false)

length = input(14, title="RSI Length")
rsiValue = rsi(close, length)

plot(rsiValue, title="RSI", color=color.purple)
hline(70, title="Overbought", color=color.red, linestyle=dashed)
hline(50, title="Midline", color=color.gray, linestyle=dotted)
hline(30, title="Oversold", color=color.green, linestyle=dashed)
```

### MACD
```pine
//@version=5
indicator("My MACD", overlay=false)

fastLength = input(12, title="Fast Length")
slowLength = input(26, title="Slow Length")
signalLength = input(9, title="Signal Length")

result = macd(close, fastLength, slowLength, signalLength)
macdLine = result.macd
signalLine = result.signal

plot(macdLine, title="MACD", color=color.blue)
plot(signalLine, title="Signal", color=color.orange)
hline(0, title="Zero", color=color.gray)
```

### Moving Averages
```pine
//@version=5
indicator("Moving Averages", overlay=true)

smaLength = input(20, title="SMA Length")
emaLength = input(50, title="EMA Length")

smaValue = sma(close, smaLength)
emaValue = ema(close, emaLength)

plot(smaValue, title="SMA", color=color.blue)
plot(emaValue, title="EMA", color=color.orange)
```

## Integration with Superchart

This is a simplified demo. To fully integrate with superchart:

1. **Use the Script Provider interface**:
```typescript
import type { ScriptProvider } from '@superchart/types/script'

class WebSocketScriptProvider implements ScriptProvider {
  async compile(code: string, language: string) {
    // Send compile request via WebSocket
  }

  async executeAsIndicator(params: ScriptExecuteParams) {
    // Send execute request via WebSocket
    // Return IndicatorSubscription
  }

  async stop(scriptId: string) {
    // Send stop request
  }
}
```

2. **Register the provider**:
```typescript
import { registerScriptProvider } from '@superchart/core'

const provider = new WebSocketScriptProvider('ws://localhost:8080')
registerScriptProvider(provider)
```

3. **Use the Script Editor widget**:
```tsx
import { SuperchartComponent } from 'superchart'
import { ScriptEditorWidget } from '@superchart/widget/script-editor'

<SuperchartComponent
  widgets={[
    { type: 'script-editor', position: 'left' }
  ]}
/>
```

## Development

### Project Structure
```
client/
├── src/
│   ├── App.tsx               # Main application
│   ├── main.tsx              # Entry point
│   └── index.css             # Styles
├── public/
├── index.html
├── vite.config.ts
├── package.json
└── .env.example
```

### Future Enhancements

- [ ] Integrate with superchart's native chart rendering
- [ ] Add script settings modal
- [ ] Save/load scripts from local storage
- [ ] Display compilation errors in the editor
- [ ] Syntax highlighting for Pine Script
- [ ] Autocomplete for built-in functions
- [ ] Multi-pane support for overlays and separate panes

## Troubleshooting

### "Not connected to server"
- Make sure the script server is running on `ws://localhost:8080`
- Check your `.env` file has the correct `VITE_SCRIPT_SERVER_URL`

### "Compilation failed"
- Check the browser console for detailed error messages
- Ensure your Pine Script syntax is correct
- Make sure all required variables are defined

### No data displayed
- Check that the symbol exists (e.g., `BINA_USDT_BTC`)
- Ensure your Coinray token is valid
- Check the server logs for errors

## License

Apache 2.0

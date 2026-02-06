# Quick Start Guide

Get the script execution example running in 5 minutes!

## Prerequisites

- Node.js 18+
- A Coinray API token ([get one here](https://coinray.com))

## Step 1: Clone and Navigate

```bash
cd /path/to/superchart/examples
```

## Step 2: Setup Server

```bash
cd server
npm install
```

Create `.env` file:
```bash
echo "COINRAY_TOKEN=your_token_here" > .env
echo "PORT=8080" >> .env
```

Start server:
```bash
npm run dev
```

You should see:
```
🚀 Script Execution Server running on ws://localhost:8080
```

## Step 3: Setup Client (in a new terminal)

```bash
cd client
npm install
```

Create `.env` file:
```bash
echo "VITE_COINRAY_TOKEN=your_token_here" > .env
echo "VITE_SCRIPT_SERVER_URL=ws://localhost:8080" >> .env
```

Start client:
```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

## Step 4: Open and Test

1. Open http://localhost:3000 in your browser
2. You should see "Connected" in the top-right corner
3. Click on "Simple RSI" example
4. Click **Execute**
5. Watch the indicator data appear in real-time!

## Troubleshooting

### Server won't start
- Make sure port 8080 is available
- Check that your COINRAY_TOKEN is correct
- Look for error messages in the terminal

### Client shows "Disconnected"
- Make sure the server is running on ws://localhost:8080
- Check your .env file has the correct VITE_SCRIPT_SERVER_URL
- Open browser console for error messages

### "Compilation failed"
- Check that your Pine Script syntax is correct
- Look at the error message for details
- Try one of the example scripts first

### No data displayed
- Make sure the symbol exists (try BINA_USDT_BTC)
- Check that your Coinray token is valid
- Look at the server logs for errors

## Next Steps

- Edit the example scripts to customize them
- Write your own Pine Script indicators
- Check out the [full documentation](./README.md)
- Explore the server [API documentation](./server/README.md)

## Example: Creating a Custom Indicator

Try this simple moving average crossover indicator:

```pine
//@version=5
indicator("SMA Crossover", overlay=true)

fastLength = input(10, title="Fast MA")
slowLength = input(20, title="Slow MA")

fastMA = sma(close, fastLength)
slowMA = sma(close, slowLength)

plot(fastMA, title="Fast MA", color=color.blue)
plot(slowMA, title="Slow MA", color=color.red)
```

1. Paste this into the editor
2. Click **Execute**
3. Watch both moving averages appear in real-time!

## Getting Help

- Read the [main README](./README.md)
- Check the [server documentation](./server/README.md)
- Check the [client documentation](./client/README.md)
- Open an issue on GitHub

---

Happy coding! 🚀

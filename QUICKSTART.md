# The Conductor's Manifold - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Option 1: Docker (Recommended)

```bash
# 1. Clone and enter directory
cd The-Conductors-Manifold

# 2. Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# 3. Start everything
docker-compose up

# 4. Open in browser
open http://localhost:3000
```

**That's it!** The system is now analyzing markets.

### Option 2: Manual (Development)

```bash
# Terminal 1: Start database
docker-compose up postgres redis

# Terminal 2: Start backend
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload

# Terminal 3: Start frontend
cd frontend
npm install
npm start
```

## 🎯 First Analysis

### Using the Dashboard

1. Open http://localhost:3000
2. Enter a symbol: `BTCUSDT` (crypto) or `AAPL` (stock)
3. Select data feed: Binance or Alpha Vantage
4. Click **Analyze**
5. Watch the 3D manifold render!

### Using the API

```bash
# Get manifold pulse
curl http://localhost:8000/api/v1/pulse/BTCUSDT?feed=binance

# Full analysis
curl http://localhost:8000/api/v1/analyze/BTCUSDT?feed=binance&timescale=daily

# Multi-scale analysis
curl http://localhost:8000/api/v1/multiscale/BTCUSDT?feed=binance
```

### Using Python

```python
import asyncio
from backend.core.manifold_engine import ManifoldEngine
from backend.services.data_ingestion import DataIngestionService, BinanceDataFeed

async def analyze_bitcoin():
    # Setup
    data_service = DataIngestionService()
    data_service.register_feed("binance", BinanceDataFeed())
    engine = ManifoldEngine()

    # Fetch data
    market_data = await data_service.fetch_data("binance", "BTCUSDT", "1d", 100)
    data_arrays = data_service.to_numpy(market_data)

    # Analyze
    metrics = engine.analyze(
        prices=data_arrays['prices'],
        volume=data_arrays['volume']
    )

    # Results
    print(f"Current Price: ${metrics.prices[-1]:,.2f}")
    print(f"Entropy Level: {metrics.entropy:.2f}")
    print(f"Singularities Detected: {len(metrics.singularities)}")
    print(f"Attractors: {len(metrics.attractors)}")

    for price, strength in metrics.attractors[:3]:
        print(f"  Attractor at ${price:,.2f} (strength: {strength:.2%})")

asyncio.run(analyze_bitcoin())
```

## 📊 Understanding the Output

### The 3D Visualization

**What you're seeing:**
- **Height** = Price level
- **Color** = Entropy (blue=calm, red=chaotic)
- **Red spheres** = Singularities (extreme events)
- **Green rings** = Attractors (support/resistance)

**How to interact:**
- **Drag** = Rotate view
- **Scroll** = Zoom in/out
- **Right-click + drag** = Pan

### The Pulse Monitor (Right Sidebar)

**Manifold State:**
- 🟢 STABLE: Calm, low risk
- 🟡 TRANSITIONAL: Moving between states
- 🟠 CHAOTIC: High volatility
- 🔴 HIGH_TENSION: Correction imminent
- 🟣 COMPRESSED: Directional pressure building

**Entropy:**
- Low (0-3): Stable, predictable
- Medium (3-5): Normal volatility
- High (5+): Chaotic, unpredictable

**Tension:**
- Low (<0.5): Relaxed
- Medium (0.5-1.5): Moderate pressure
- High (>1.5): Extreme - correction likely

**Nearest Attractor:**
- Shows the closest natural resting point
- Distance tells you how far price has to move

## 🔔 Setting Up Alerts

```python
from backend.services.alert_system import alert_system, WebhookAlertCallback

# Add webhook for Slack/Discord/etc
alert_system.add_callback(
    WebhookAlertCallback("https://hooks.slack.com/your-webhook")
)

# Start monitoring
await alert_system.monitor_symbol(
    "BTCUSDT",
    data_service,
    engine,
    interval=60  # Check every minute
)
```

You'll get alerts for:
- 🚨 Singularities detected
- ⚠️ High tension warnings
- 📊 Entropy spikes
- ✅ Attractor approaches

## 🧪 Try These Examples

### 1. Compare Multiple Symbols
```bash
# Bitcoin
curl http://localhost:8000/api/v1/pulse/BTCUSDT?feed=binance

# Ethereum
curl http://localhost:8000/api/v1/pulse/ETHUSDT?feed=binance

# Apple Stock
curl http://localhost:8000/api/v1/pulse/AAPL?feed=alphavantage
```

### 2. Multi-Timeframe View
In the dashboard:
1. Click **Multi-Scale** button
2. See the same symbol across monthly/weekly/daily/intraday
3. Observe fractal patterns repeating

### 3. Detect Patterns with ML
```python
from ml.models.pattern_recognition import SingularityPredictor

predictor = SingularityPredictor()
predictions = predictor.predict(metrics)

if predictions['singularity_probability'] > 0.7:
    print("⚠️ Singularity forming! Extreme event likely soon.")
```

## 📝 Common Use Cases

### Day Trading
```python
# Monitor intraday with 5-minute checks
await alert_system.monitor_symbol("BTCUSDT", data_service, engine, interval=300)
```

### Swing Trading
```python
# Daily analysis with attractor targets
metrics = engine.analyze(prices, timescale=TimeScale.DAILY)
targets = [price for price, strength in metrics.attractors if strength > 0.5]
```

### Long-term Analysis
```python
# Multi-scale for macro perspective
analyzer = MultiScaleAnalyzer()
results = analyzer.analyze_multiscale(prices, timestamps)
monthly_metrics = results[TimeScale.MONTHLY]
```

## 🐛 Troubleshooting

**"No data found for symbol"**
- Check symbol spelling (BTCUSDT, not BTC)
- Verify feed (binance for crypto, alphavantage for stocks)
- Alpha Vantage demo key has rate limits

**"WebSocket connection failed"**
- Ensure backend is running on port 8000
- Check CORS settings in backend/api/main.py

**"3D visualization not rendering"**
- Check browser console for errors
- Ensure Three.js loaded (check network tab)
- Try refreshing the page

**"High memory usage"**
- Reduce data limit (use `limit=50` instead of 100)
- Clear browser cache
- Restart Docker containers

## 🎓 Next Steps

1. **Read IMPLEMENTATION.md** - Full technical documentation
2. **Read ARCHITECTURE.md** - System design details
3. **Explore API docs** - http://localhost:8000/docs
4. **Customize manifold engine** - Adjust sensitivity, thresholds
5. **Train ML models** - Use your own historical data
6. **Add authentication** - Implement tiered access

## 💡 Pro Tips

- **Start with pulse endpoint** - Quickest way to understand current state
- **Use multiscale for major decisions** - See the full picture
- **Watch for singularity clusters** - Multiple extremes = major movement
- **Trust the attractors** - Natural resting points are real
- **Monitor tension** - High tension = wait for release before trading

## 🎵 The Conductor Mindset

You're not predicting the future - you're **reading the present**.

The manifold shows you:
- Where tension has accumulated
- Where it's likely to release
- How stable or chaotic the system is right now
- Natural zones where price wants to rest

Think like a conductor reading a symphony in progress, not a fortune teller.

---

**The manifold awaits your interpretation.**

© 2025 Joshua Johosky. All Rights Reserved.

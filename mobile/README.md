# The Conductor's Manifold - Mobile App

Cross-platform (iOS/Android) read-only mobile client for multi-scale projections and interpretation.

## Features

- **Multi-Scale Analysis**: View projections across micro (1H), short (4H), medium (1D), long (1W), and macro (1M) horizons
- **Price Projections**: Projected ranges, attractor targets, and directional bias
- **Interpretation Panel**: Conductor's interpretation in plain language using forensic labels and geometric terminology
- **Model Quality Indicators**: Confidence scores and quality grades
- **Real-Time Pulse**: Live price, phase, and tension monitoring
- **Fractal Consistency**: Cross-scale pattern analysis

## Architecture

```
mobile/
├── App.tsx                 # Main app entry with navigation
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ScaleSelector   # Horizon selection
│   │   ├── ProjectionDisplay # Price projections & targets
│   │   ├── InterpretationPanel # Conductor's reading
│   │   ├── LoadingState    # Loading indicator
│   │   └── ErrorState      # Error handling
│   ├── screens/
│   │   ├── AnalysisScreen  # Main single-scale view
│   │   └── MultiscaleScreen # All horizons view
│   ├── services/
│   │   └── api.ts          # API client with caching
│   ├── hooks/
│   │   └── useManifold.ts  # React Query hooks
│   └── types/
│       └── index.ts        # TypeScript definitions
```

## Security: Read-Only Enforcement

**IMPORTANT**: This mobile app is read-only by backend permission, not by UI convention.

The server enforces read-only access:

1. **Role-Based Access**: Mobile clients use the `mobile_viewer` role
2. **Server-Side Enforcement**: The backend rejects all non-GET requests for this role
3. **Scope Restriction**: Only `read:manifold`, `read:interpretation`, `read:projections` scopes

### Verification

The app can verify read-only enforcement:

```typescript
import { api } from './src/services/api';

// This will return { success: true } because 403 is expected
const result = await api.testWriteEndpoint();
console.log(result); // { success: true } = read-only working
```

## Quick Start

### Option 1: Local Development (Recommended)

```bash
# 1. Start the backend (from project root)
docker-compose up postgres redis backend

# 2. In another terminal, start the mobile app
cd mobile
npm install
npx expo start

# 3. Scan QR code with Expo Go app on your phone
#    Or press 'i' for iOS simulator / 'a' for Android emulator
```

### Option 2: Docker (Full Stack)

```bash
# From project root
docker-compose -f docker-compose.yml -f docker-compose.mobile.yml up

# The Expo development server will be available at:
# - Metro bundler: http://localhost:8081
# - DevTools: http://localhost:19002
```

### Option 3: Production Build

```bash
cd mobile

# Build for iOS
npx expo build:ios

# Build for Android
npx expo build:android

# Or use EAS Build (recommended)
npx eas build --platform all
```

## Configuration

### Environment Variables

Create a `.env.local` file in the mobile directory:

```bash
# API Configuration
API_URL=http://localhost:8000

# Your mobile API key (get from admin)
MOBILE_API_KEY=your_api_key_here

# Optional: Tenant ID for multi-tenant setups
TENANT_ID=your_tenant_id
```

### API Client Configuration

```typescript
import { configureApi } from './src/services/api';

configureApi({
  baseUrl: 'https://your-api-server.com',
  apiKey: 'your_mobile_api_key',
  tenantId: 'your_tenant_id',
  cacheExpiry: 60000, // 1 minute
});
```

## API Endpoints

The mobile app consumes the `/api/v2/mobile` endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check (no auth) |
| `GET /projections/{symbol}` | Price projections for a horizon |
| `GET /interpretation/{symbol}` | Conductor's interpretation |
| `GET /multiscale/{symbol}` | Analysis across all horizons |
| `GET /pulse/{symbol}` | Lightweight status check |
| `GET /symbols` | Available symbols for a feed |
| `POST /test-write` | Verify read-only (should 403) |

### Example Requests

```bash
# Get projections
curl -H "X-MOBILE-API-KEY: demo_mobile_key" \
  "http://localhost:8000/api/v2/mobile/projections/BTCUSDT?horizon=medium&feed=binanceus"

# Get interpretation
curl -H "X-MOBILE-API-KEY: demo_mobile_key" \
  "http://localhost:8000/api/v2/mobile/interpretation/BTCUSDT?horizon=medium"

# Test read-only enforcement (should return 403)
curl -X POST -H "X-MOBILE-API-KEY: demo_mobile_key" \
  "http://localhost:8000/api/v2/mobile/test-write"
# Response: {"detail":"Mobile viewer role is read-only. POST requests are not permitted."}
```

## Data Feeds

| Feed | Symbols | Example |
|------|---------|---------|
| `binanceus` | Crypto pairs | BTCUSDT, ETHUSDT |
| `alphavantage` | US Stocks | AAPL, MSFT, TSLA |
| `coingecko` | Crypto (rate limited) | bitcoin, ethereum |

## Screens

### Analysis Screen (Main)

- Symbol input with crypto/stock toggle
- Live pulse display (price, phase, tension)
- Horizon selector (1H to 1M)
- Price projections with quality grade
- Full interpretation panel

### Multiscale Screen

- All horizons displayed simultaneously
- Fractal consistency score
- Dominant phase identification
- Comparative view across timeframes

## Caching Strategy

The app implements multi-layer caching:

1. **Memory Cache**: In-memory LRU cache for fastest access
2. **React Query Cache**: Automatic stale-while-revalidate
3. **Background Refresh**: Periodic refetching for fresh data

Cache durations:
- Pulse: 30 seconds
- Projections/Interpretation: 60 seconds
- Multiscale: 120 seconds
- Symbols list: 5 minutes

## Error Handling

The app handles these error scenarios gracefully:

- **401 Unauthorized**: Invalid or missing API key
- **403 Forbidden**: Insufficient permissions or write attempt
- **404 Not Found**: Invalid symbol
- **429 Rate Limited**: Too many requests
- **500 Server Error**: Backend issues
- **Network Errors**: Offline/timeout

## Troubleshooting

### "Invalid API key"
- Verify your `X-MOBILE-API-KEY` header
- Check if the key has the `mobile_viewer` role
- Default demo key: `demo_mobile_key`

### "Rate limit exceeded"
- Demo keys have 30 req/min limit
- Wait 1 minute before retrying
- Consider upgrading to paid tier

### "No data found for symbol"
- Check symbol format (e.g., `BTCUSDT` not `BTC`)
- Verify the correct feed is selected
- Some symbols may not be available

### Metro bundler issues
```bash
# Clear Metro cache
npx expo start -c

# Reset node_modules
rm -rf node_modules && npm install
```

## Development

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Testing

```bash
npm test
```

## License

© 2025 Joshua Johosky. All Rights Reserved.

See [LICENSE.md](../License.md) for details.

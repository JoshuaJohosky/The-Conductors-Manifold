# Mobile App Documentation

Complete guide for The Conductor's Manifold mobile application.

## Overview

The mobile app provides a cross-platform (iOS/Android) read-only interface for viewing multi-scale projections and interpretations. It is designed for SaaS deployment with:

- **Read-only by backend permission** (not UI convention)
- **Role-based access control** with `mobile_viewer` scope
- **Tenant isolation** for multi-tenant deployments
- **Caching layer** for performance and offline resilience

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Expo Go app on mobile device (or iOS/Android simulator)

### Running Backend + Mobile

```bash
# Terminal 1: Start the backend services
docker-compose up

# Terminal 2: Start the mobile app
cd mobile
npm install
npx expo start
```

Then scan the QR code with Expo Go on your phone.

### All-in-One Docker

```bash
docker-compose -f docker-compose.yml -f docker-compose.mobile.yml up
```

## Architecture

### Backend Mobile API (v2)

Location: `backend/api/mobile_api.py`

The mobile API is a versioned surface at `/api/v2/mobile/` that:
- Enforces read-only access via role checking
- Returns mobile-optimized response shapes
- Implements rate limiting per tenant
- Supports tenant isolation

### Mobile Auth Service

Location: `backend/services/mobile_auth.py`

Features:
- Role-based access control (`admin`, `analyst`, `mobile_viewer`, `demo`)
- API key validation with secure storage
- Server-side read-only enforcement
- Rate limiting (120 req/min standard, 30 req/min demo)

### Mobile App (Expo/React Native)

Location: `mobile/`

Built with:
- **Expo** - Cross-platform framework
- **TypeScript** - Type safety
- **React Navigation** - Screen navigation
- **React Query** - Data fetching with caching
- **Expo Secure Store** - Secure credential storage

## API Reference

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v2/mobile/health` | No | Health check |
| GET | `/api/v2/mobile/projections/{symbol}` | Yes | Price projections |
| GET | `/api/v2/mobile/interpretation/{symbol}` | Yes | Conductor's reading |
| GET | `/api/v2/mobile/multiscale/{symbol}` | Yes | All-horizon analysis |
| GET | `/api/v2/mobile/pulse/{symbol}` | Yes | Lightweight status |
| GET | `/api/v2/mobile/symbols` | Yes | Available symbols |
| POST | `/api/v2/mobile/test-write` | Yes | Returns 403 (verify read-only) |

### Authentication

Set the `X-MOBILE-API-KEY` header:

```bash
curl -H "X-MOBILE-API-KEY: demo_mobile_key" \
  http://localhost:8000/api/v2/mobile/pulse/BTCUSDT
```

Optional tenant header for multi-tenant:

```bash
curl -H "X-MOBILE-API-KEY: your_key" \
     -H "X-TENANT-ID: tenant_123" \
  http://localhost:8000/api/v2/mobile/pulse/BTCUSDT
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `horizon` | string | `medium` | Analysis horizon: `micro`, `short`, `medium`, `long`, `macro` |
| `feed` | string | `binanceus` | Data feed: `binanceus`, `alphavantage`, `coingecko` |

### Response Examples

**Projections Response:**
```json
{
  "symbol": "BTCUSDT",
  "feed": "binanceus",
  "projections": {
    "current_price": 98500.00,
    "projected_range": {
      "low": 95000.00,
      "high": 102000.00,
      "range_pct": 3.5
    },
    "targets": [
      {"price": 100000.00, "strength": 0.85, "distance_pct": 1.5, "direction": "above"}
    ],
    "directional_bias": {
      "direction": "bullish",
      "confidence": 72
    },
    "horizon": "medium"
  },
  "model_quality": {
    "overall": 78,
    "grade": "B"
  }
}
```

**Interpretation Response:**
```json
{
  "symbol": "BTCUSDT",
  "horizon": "medium",
  "interpretation": {
    "phase_title": "Impulse Phase",
    "phase_detail": "The manifold is sharpening - curvature intensifying...",
    "conductor_view": "Building toward climax - orchestral intensity rising",
    "singer_view": "Smooth melodic flow - natural movement",
    "curvature": "sharpening - psychological heat accumulating",
    "tension": "high - pressure building",
    "entropy": "elevated - active movement",
    "wave_context": "Impulse wave (1, 3, or 5) - curvature sharpening",
    "narrative": "The manifold is in an impulse leg...",
    "warning": null
  },
  "confidence": 72.5,
  "metrics": {
    "curvature": 0.8542,
    "entropy": 4.23,
    "tension": 1.12
  }
}
```

## Read-Only Enforcement

### How It Works

1. **Role Assignment**: Mobile API keys are assigned the `mobile_viewer` role
2. **Request Interception**: Every request is validated by `get_mobile_user()` dependency
3. **Method Check**: Non-GET methods are rejected with 403 for `mobile_viewer` and `demo` roles
4. **Scope Validation**: Only read scopes are allowed

### Code Flow

```python
# backend/services/mobile_auth.py

async def get_mobile_user(request: Request, api_key: str):
    user = validate_api_key(api_key)

    # Enforce read-only for mobile_viewer and demo roles
    if user.role in [UserRole.MOBILE_VIEWER, UserRole.DEMO]:
        if request.method not in ["GET", "HEAD", "OPTIONS"]:
            raise HTTPException(
                status_code=403,
                detail=f"Mobile viewer role is read-only. {request.method} requests are not permitted."
            )

    return user
```

### Verification

Run the test script:

```bash
./scripts/test_mobile_readonly.sh http://localhost:8000
```

Expected output:
```
[PASS] POST /test-write - POST should be rejected
       Status: 403 (expected: 403)

[PASS] PUT /test-write - PUT should be rejected
       Status: 403 (expected: 403)

[PASS] DELETE /test-write - DELETE should be rejected
       Status: 403 (expected: 403)

All tests passed! Read-only enforcement is working correctly.
```

## Mobile App Components

### ScaleSelector

Horizontal scrolling selector for analysis horizon:

```tsx
<ScaleSelector
  selectedScale="medium"
  onSelectScale={(scale) => setScale(scale)}
  disabled={isLoading}
/>
```

### ProjectionDisplay

Shows price projections with:
- Current price
- Projected range (low/high)
- Directional bias with confidence
- Attractor targets
- Model quality grade

### InterpretationPanel

Displays the Conductor's interpretation:
- Phase diagnosis (Impulse, Singularity, Correction, etc.)
- Conductor view (macro perspective)
- Singer view (micro geometry)
- Geometric state (curvature, tension, entropy)
- Wave context
- Market narrative
- Warnings when applicable

### LoadingState / ErrorState

Consistent loading and error UI with:
- Animated loading spinner
- Retry functionality
- Helpful error messages
- Status-specific suggestions

## Caching Strategy

### Client-Side Caching

```typescript
// Memory cache with expiration
const memoryCache = new Map<string, CacheEntry<unknown>>();

// Cache durations
PULSE: 30 seconds
PROJECTIONS: 60 seconds
MULTISCALE: 120 seconds
SYMBOLS: 5 minutes
```

### React Query Integration

```typescript
const { data, isLoading, refetch } = useProjections(
  symbol,
  horizon,
  feed,
  {
    refetchInterval: 60000, // Auto-refresh every minute
    staleTime: 30000,       // Consider fresh for 30s
  }
);
```

## Environment Configuration

### Backend (.env)

```bash
# Mobile API
MOBILE_API_SECRET=your_secure_secret_here
DEMO_API_KEY=demo_mobile_key

# Optional: Custom rate limits
MOBILE_RATE_LIMIT=120
DEMO_RATE_LIMIT=30
```

### Mobile (app.json)

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://localhost:8000"
    }
  }
}
```

### Mobile Runtime Configuration

```typescript
import { configureApi } from './src/services/api';

configureApi({
  baseUrl: 'https://api.your-domain.com',
  apiKey: 'your_api_key',
  tenantId: 'tenant_id',
});
```

## SaaS Deployment Considerations

### Multi-Tenant Setup

1. **Tenant Isolation**: Each API key is associated with a tenant ID
2. **Data Filtering**: Responses are filtered by tenant context
3. **Rate Limiting**: Per-tenant rate limits prevent abuse

### API Key Provisioning

```python
from backend.services.mobile_auth import generate_mobile_api_key, UserRole

# Generate key for a new mobile user
api_key = generate_mobile_api_key(
    user_id="user_123",
    tenant_id="tenant_456",
    role=UserRole.MOBILE_VIEWER
)
# Returns: "cm_abc123_def456..."
```

### Subscription Tiers

Example tier implementation:

| Tier | Rate Limit | Features |
|------|------------|----------|
| Demo | 30/min | Basic projections |
| Standard | 120/min | Full projections + interpretation |
| Pro | 300/min | Multi-scale + real-time pulse |

## Troubleshooting

### Backend Issues

**"Module not found: backend.api.mobile_api"**
```bash
# Ensure the router is imported in main.py
# Check backend/api/main.py includes:
from backend.api.mobile_api import router as mobile_router
app.include_router(mobile_router)
```

**"401 Unauthorized"**
- Check X-MOBILE-API-KEY header is set
- Verify key exists in the key store

**"403 Forbidden" on GET requests**
- Verify the API key has correct role
- Check tenant ID matches

### Mobile Issues

**Metro bundler errors**
```bash
cd mobile
rm -rf node_modules .expo
npm install
npx expo start -c
```

**API connection issues**
- Verify backend is running on port 8000
- Check API_URL configuration
- Ensure device is on same network (for local dev)

## Files Reference

```
The-Conductors-Manifold/
├── backend/
│   ├── api/
│   │   ├── main.py              # Main API (includes mobile router)
│   │   └── mobile_api.py        # Mobile API v2 endpoints
│   └── services/
│       └── mobile_auth.py       # Mobile auth & role enforcement
├── mobile/
│   ├── App.tsx                  # App entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── app.json                 # Expo configuration
│   ├── Dockerfile              # Mobile dev container
│   └── src/
│       ├── components/          # UI components
│       ├── screens/             # App screens
│       ├── services/            # API client
│       ├── hooks/               # React hooks
│       └── types/               # TypeScript types
├── docker-compose.mobile.yml    # Mobile dev compose
├── scripts/
│   └── test_mobile_readonly.sh  # Read-only verification
└── MOBILE.md                    # This documentation
```

## License

© 2025 Joshua Johosky. All Rights Reserved.

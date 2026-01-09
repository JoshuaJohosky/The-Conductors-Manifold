# Remote Access Guide: The Conductor's Manifold
## Secure Mobile Access to Your Market Analysis Dashboard

**Purpose:** Monitor the manifold from anywhere - track institutional flows, detect singularities, and observe market geometry from your phone while the Feb 11, 2026 convergence approaches.

---

## Table of Contents

1. [Quick Start (Local Network)](#quick-start-local-network)
2. [Production Deployment (Internet Access)](#production-deployment)
3. [SSL/HTTPS Setup](#ssl-https-setup)
4. [Mobile Access Configuration](#mobile-access-configuration)
5. [Security Hardening](#security-hardening)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start (Local Network)

### Access from Phone on Same WiFi Network

**Step 1: Start the Production Stack**

```bash
# Create .env file with your API keys
cp .env.example .env
nano .env  # Add your ALPHAVANTAGE_API_KEY

# Start with Nginx reverse proxy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Step 2: Find Your Computer's IP Address**

```bash
# On Linux/Mac
hostname -I | awk '{print $1}'

# On Windows (PowerShell)
ipconfig | findstr IPv4
```

**Step 3: Access from Phone**

- Connect phone to same WiFi network
- Open browser on phone
- Navigate to: `http://YOUR_IP_ADDRESS`
- Example: `http://192.168.1.100`

**You should see:** The Conductor's Manifold dashboard loads with real-time metrics.

---

## Production Deployment (Internet Access)

For access from anywhere (cellular, different networks), you have three options:

### Option A: Cloud Deployment (Recommended)

**Railway.app (Easiest)**

1. **Sign up:** https://railway.app
2. **Create new project** → "Deploy from GitHub"
3. **Connect repository:** JoshuaJohosky/The-Conductors-Manifold
4. **Add services:**
   - Backend (Port 8000)
   - Frontend (Port 3000)
   - PostgreSQL (built-in)
   - Redis (built-in)
5. **Set environment variables:**
   ```
   ALPHAVANTAGE_API_KEY=your_key_here
   CONDUCTOR_API_KEY=your_master_key
   SECRET_KEY=generate_random_32_chars
   ```
6. **Deploy** → Railway provides HTTPS URL automatically
7. **Access from phone:** `https://your-app.railway.app`

**Estimated Cost:** $5-10/month

---

**DigitalOcean App Platform**

1. **Create account:** https://www.digitalocean.com/products/app-platform
2. **Create app from GitHub**
3. **Configure services:**
   - Web Service: Backend (Dockerfile.backend)
   - Static Site: Frontend (Dockerfile.frontend)
   - Database: PostgreSQL (managed)
   - Database: Redis (managed)
4. **Set environment variables** (same as above)
5. **Deploy** → Access at `https://your-app.ondigitalocean.app`

**Estimated Cost:** $12-20/month

---

### Option B: Home Server with Cloudflare Tunnel (Free)

**No port forwarding required. No static IP needed.**

**Step 1: Install Cloudflare Tunnel**

```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Authenticate
cloudflared tunnel login
```

**Step 2: Create Tunnel**

```bash
# Create tunnel named "manifold"
cloudflared tunnel create manifold

# Route your domain (if you have one) or use trycloudflare.com
cloudflared tunnel route dns manifold manifold.yourdomain.com

# Or use free temporary domain:
cloudflared tunnel --url http://localhost:80
```

**Step 3: Configure Tunnel**

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/user/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: manifold.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

**Step 4: Run Tunnel**

```bash
# Start the manifold
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Start tunnel (as systemd service or screen session)
cloudflared tunnel run manifold
```

**Step 5: Access from Phone**

- Navigate to `https://manifold.yourdomain.com`
- Cloudflare automatically provides SSL/HTTPS
- No router configuration needed
- Works from anywhere

**Cost:** FREE (Cloudflare Tunnel is free)

---

### Option C: Port Forwarding (Advanced)

**Only if you control your router and have a static/dynamic DNS setup.**

**Step 1: Configure Router**

1. Log into your router (usually http://192.168.1.1)
2. Find "Port Forwarding" or "NAT" settings
3. Forward external port 80 → internal IP:80 (HTTP)
4. Forward external port 443 → internal IP:443 (HTTPS)

**Step 2: Get Your Public IP**

```bash
curl ifconfig.me
```

**Step 3: Set Up Dynamic DNS (if IP changes)**

- Use services like: DuckDNS, No-IP, Dynu
- Create subdomain: `manifold.duckdns.org`
- Configure router to update IP automatically

**Step 4: Access from Phone**

- Navigate to `http://YOUR_PUBLIC_IP` or `http://manifold.duckdns.org`

**⚠️ Security Warning:** This exposes your home network. Use with SSL and strong authentication.

---

## SSL/HTTPS Setup

### Option 1: Let's Encrypt (Free SSL)

**If using a domain:**

```bash
# Install certbot
sudo apt install certbot

# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Get certificate
sudo certbot certonly --standalone -d manifold.yourdomain.com

# Certificates saved to:
# /etc/letsencrypt/live/manifold.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/manifold.yourdomain.com/privkey.pem

# Mount in docker-compose.prod.yml
# Uncomment SSL volume in nginx service:
# - /etc/letsencrypt/live/manifold.yourdomain.com:/etc/nginx/ssl:ro

# Restart
docker-compose -f docker-compose.prod.yml up -d
```

**Edit `config/nginx.conf`:**
- Uncomment the HTTPS server block (line ~77)
- Update `server_name` to your domain
- Uncomment HTTP → HTTPS redirect (line ~23)

### Option 2: Cloudflare (Automatic)

If using Cloudflare Tunnel (Option B above), SSL is automatic. No configuration needed.

---

## Mobile Access Configuration

### Create Phone Bookmark

**iOS (Safari):**
1. Navigate to your manifold URL
2. Tap Share button
3. Tap "Add to Home Screen"
4. Name it "The Manifold"
5. Icon appears on home screen like an app

**Android (Chrome):**
1. Navigate to your manifold URL
2. Tap three dots menu
3. Tap "Add to Home screen"
4. Name it "The Manifold"

### Optimized Mobile View

The dashboard is responsive, but for best mobile experience:

**Edit `.env` to prioritize mobile metrics:**

```bash
# Display modes
MOBILE_OPTIMIZED=true
SHOW_SIMPLIFIED_METRICS=true
```

**Or use query parameters:**
```
https://your-manifold.com/?mobile=1&simplified=1
```

---

## Security Hardening

### 1. Strong Authentication

**Set a strong master key in `.env`:**

```bash
# Generate secure key
openssl rand -hex 32

# Add to .env
CONDUCTOR_API_KEY=your_64_character_hex_key_here
SECRET_KEY=another_64_character_hex_key_here
```

**Add to phone/browser:**
- All API requests require `X-CONDUCTOR-KEY` header
- Use browser extension or bookmark with header:

```javascript
javascript:(function(){
  fetch('/api/v1/pulse/BTCUSDT', {
    headers: {'X-CONDUCTOR-KEY': 'your_key_here'}
  }).then(r=>r.json()).then(console.log)
})()
```

### 2. IP Whitelisting (Optional)

**Edit `config/nginx.conf`:**

```nginx
# Allow only your phone's IP or carrier network
location /api/ {
    allow 192.168.1.0/24;  # Your home network
    allow YOUR_PHONE_IP;    # Your phone's IP
    deny all;

    proxy_pass http://backend_api;
}
```

### 3. Rate Limiting

Already configured in `nginx.conf`:
- API endpoints: 30 requests/minute
- WebSocket connections: 10/minute

Adjust if needed:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/m;  # Increase to 60/min
```

### 4. Firewall Rules

**On your server:**

```bash
# Allow only HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Or restrict to specific IPs
sudo ufw allow from YOUR_PHONE_IP to any port 80
```

---

## Monitoring Dashboard Health

### Health Check Endpoint

```bash
curl http://your-manifold.com/health
# Returns: "healthy"
```

### Monitor Logs from Phone

**Using SSH from phone (Termux/JuiceSSH):**

```bash
ssh your-server
docker logs -f conductors-backend --tail 50
```

### Set Up Alerts

**Create uptime monitor with:**
- UptimeRobot (free)
- Monitor URL: `http://your-manifold.com/health`
- Alert if down > 5 minutes
- Notifications to your phone

---

## Troubleshooting

### Can't Access from Phone

**Check 1: Same Network?**
```bash
# Phone and computer must be on same WiFi for local access
# Use ping from phone terminal app:
ping YOUR_COMPUTER_IP
```

**Check 2: Firewall Blocking?**
```bash
# Temporarily disable to test
sudo ufw disable
# If it works, add rule:
sudo ufw allow from 192.168.0.0/16 to any port 80
sudo ufw enable
```

**Check 3: Docker Running?**
```bash
docker ps
# Should show: conductors-nginx, conductors-backend, conductors-frontend
```

### SSL Certificate Errors

**Problem:** "Your connection is not private"

**Solution 1: Self-signed certificate**
```bash
# Generate self-signed cert (for testing only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem -out ssl/fullchain.pem
```

**Solution 2: Use Cloudflare** (automatic SSL)

### WebSocket Connection Fails

**Check nginx logs:**
```bash
docker logs conductors-nginx
```

**Common fix:** Ensure WebSocket upgrade headers are set in `nginx.conf` (already configured).

### Slow Performance on Phone

**Reduce data frequency:**

Edit `frontend/src/components/Dashboard.jsx`:
```javascript
// Line 35: Change from 30 seconds to 60 seconds
const interval = setInterval(loadPulseData, 60000);
```

**Enable simplified mode:**
```
https://your-manifold.com/?simplified=1
```

---

## Quick Reference Card

**For when you're monitoring XRP at $2.13 and need fast access:**

| Scenario | URL | Command |
|----------|-----|---------|
| Local WiFi | `http://192.168.1.X` | `hostname -I` to find IP |
| Cloudflare Tunnel | `https://manifold.yourdomain.com` | `cloudflared tunnel run` |
| Railway | `https://your-app.railway.app` | Auto-deployed |
| Health Check | `/health` | Returns "healthy" |
| API Test | `/api/v1/pulse/XRPUSDT` | Requires auth header |

**Auth Header:**
```
X-CONDUCTOR-KEY: your_master_key_here
```

**Emergency Stop:**
```bash
docker-compose -f docker-compose.prod.yml down
```

---

## Recommended Setup for Feb 11, 2026 Convergence

**Configuration:**
1. **Deploy to Railway** (easiest, automatic SSL)
2. **Set up phone bookmark** (home screen icon)
3. **Enable UptimeRobot** (free monitoring)
4. **Configure WebSocket auto-reconnect** (already implemented)

**Monitoring Strategy:**
- Check pulse every 30 seconds (automatic)
- Alert on `phase: "SINGULARITY FORMING"`
- Alert on `entropy > 5.0` (chaotic state)
- Alert on `tension > 1.5` (high tension)

**When the $1B institutional build begins:**
Your phone will show the manifold phase transition in real-time. The pylon strength will drop as singularities form, and the 3D visualization will pulse red as the market enters the high-tension compressed state before the breakout.

---

## Status: Nginx Proxy Configured ✅

Your system is now ready for secure remote access. Choose your deployment method and follow the steps above.

**Next:** Test local access → Deploy to production → Monitor from phone as institutional flows crystallize.

---

*The Conductor's Manifold - Geometric Market Analysis*
*"Watch the market breathe from anywhere"*

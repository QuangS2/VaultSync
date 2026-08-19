#!/bin/bash
# ==============================================================================
# VaultSync — Production Health & Resource Monitor (11/10 Precision)
# Checks CPU, RAM, Disk usage, container statuses, and endpoint responsiveness.
# Run on Ubuntu VPS with: bash docker/health-monitor.sh
# ==============================================================================

set -euo pipefail

APP_DIR="/opt/vaultsync"
cd "$APP_DIR" 2>/dev/null || true

echo "================================================================================"
echo "📊 VAULTSYNC PRODUCTION HEALTH MONITOR"
echo "🕒 Timestamp: $(date '+%Y-%m-%d %H:%M:%S UTC')"
echo "================================================================================"

# 1. System Resources
echo "--- [1/4] SYSTEM RESOURCE UTILIZATION ---"
echo "🖥️  CPU Load: $(uptime | awk -F'load average:' '{ print $2 }')"
echo "🧠 Memory Usage:"
free -h | awk 'NR==1{printf "   %-10s %-10s %-10s\n", $1, $2, $3} NR==2{printf "   Mem:       %-10s %-10s\n", $2, $3}'
echo "💾 Disk Usage:"
df -h / | awk 'NR==1{printf "   %-15s %-10s %-10s %-10s\n", "Filesystem", "Size", "Used", "Avail"} NR==2{printf "   %-15s %-10s %-10s %-10s (%s used)\n", $1, $2, $3, $4, $5}'

# Alert if disk > 85%
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "⚠️ WARNING: Disk usage is critically high ($DISK_USAGE%)!"
else
    echo "✅ Disk health: Normal ($DISK_USAGE% used)."
fi

# 2. Docker Container Health
echo -e "\n--- [2/4] DOCKER CONTAINERS STATUS ---"
if command -v docker >/dev/null 2>&1; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "❌ Docker CLI not found."
fi

# 3. HTTP Gateway Smoke Test
echo -e "\n--- [3/4] GATEWAY HTTP PROBE ---"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/healthz || echo "000")
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ]; then
    echo "✅ Gateway HTTP Response: HTTP $HTTP_STATUS OK"
else
    echo "❌ Gateway HTTP Check Failed (Got HTTP $HTTP_STATUS)"
fi

# 4. Redis Container Probe
echo -e "\n--- [4/4] REDIS AUTHENTICATED PING ---"
if docker ps --format '{{.Names}}' | grep -q "vaultsync-redis"; then
    REDIS_CONTAINER=$(docker ps --format '{{.Names}}' | grep "vaultsync-redis" | head -n 1)
    # Ping Redis
    REDIS_PING=$(docker exec "$REDIS_CONTAINER" sh -c 'redis-cli -a "${REDIS_PASSWORD:-vaultsync_secure_redis_pass}" ping 2>/dev/null' || echo "FAIL")
    if [ "$REDIS_PING" = "PONG" ]; then
        echo "✅ Redis Cache Status: Healthy (PONG)"
    else
        echo "⚠️ Redis Ping check returned: $REDIS_PING"
    fi
else
    echo "ℹ️ Redis container not currently running in standalone check mode."
fi

echo "================================================================================"
echo "🏁 Health Check Complete."
echo "================================================================================"

#!/bin/bash
# ==============================================================================
# VaultSync — Production Automated Backup & Retention Script (11/10 Precision)
# Backs up Redis AOF data & Let's Encrypt certificates with 14-day retention.
# Run on Ubuntu VPS with: bash docker/backup-vaultsync.sh
# Can be scheduled via cron: 0 3 * * * /opt/vaultsync/docker/backup-vaultsync.sh
# ==============================================================================

set -euo pipefail

APP_DIR="/opt/vaultsync"
BACKUP_DIR="$APP_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TARGET_FILE="$BACKUP_DIR/vaultsync_backup_$TIMESTAMP.tar.gz"
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"

echo "================================================================================"
echo "📦 Starting VaultSync Backup: $TARGET_FILE"
echo "================================================================================"

# 1. Trigger Redis BGSAVE inside container if running
if docker ps --format '{{.Names}}' | grep -q "vaultsync-redis"; then
    echo "Step 1: Triggering Redis background save..."
    REDIS_CONTAINER=$(docker ps --format '{{.Names}}' | grep "vaultsync-redis" | head -n 1)
    docker exec "$REDIS_CONTAINER" sh -c 'redis-cli -a "${REDIS_PASSWORD:-vaultsync_secure_redis_pass}" bgsave 2>/dev/null || true'
    sleep 2
fi

# 2. Archive Redis data volume & SSL certs volume
echo "Step 2: Archiving Redis state & SSL certificates..."
docker run --rm \
  -v vaultsync_production_redis_prod_data:/redis_data:ro \
  -v vaultsync_production_certbot_conf:/letsencrypt_data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar -czf "/backup/vaultsync_backup_$TIMESTAMP.tar.gz" -C / redis_data letsencrypt_data

# 3. Secure backup file permissions (Only root / app owner can read)
chmod 600 "$TARGET_FILE"

# 4. Remove backups older than RETENTION_DAYS
echo "Step 3: Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "vaultsync_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

BACKUP_SIZE=$(ls -lh "$TARGET_FILE" | awk '{print $5}')
echo "================================================================================"
echo "🎉 SUCCESS: Backup created ($BACKUP_SIZE) at $TARGET_FILE"
echo "================================================================================"

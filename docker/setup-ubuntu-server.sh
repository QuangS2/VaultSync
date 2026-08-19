#!/bin/bash
# ==============================================================================
# VaultSync — Ubuntu Production Server One-Time Provisioning Script (11/10 Precision)
# Prepares directories, permissions, firewall, and initial configuration on Ubuntu.
# Run on fresh Ubuntu VPS with: bash setup-ubuntu-server.sh
# ==============================================================================

set -euo pipefail

echo "================================================================================"
echo "⚡ VaultSync Ubuntu Server Setup & Security Hardening"
echo "================================================================================"

APP_DIR="/opt/vaultsync"

# 1. Update packages and install prerequisites
echo "Step 1: Updating system packages & installing utilities..."
sudo apt-get update -y
sudo apt-get install -y curl wget git ufw fail2ban

# 2. Setup Application Directory
echo "Step 2: Creating app directory at $APP_DIR..."
sudo mkdir -p "$APP_DIR/docker"
sudo chown -R "$USER:$USER" "$APP_DIR"

# 3. Configure UFW Firewall (Only Ports 22, 80, 443)
echo "Step 3: Hardening UFW Firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP ACME Challenge'
sudo ufw allow 443/tcp comment 'HTTPS & WSS'
echo "y" | sudo ufw enable || true
sudo ufw status verbose

# 4. Configure Docker Daemon Log Rotation (Prevents VPS disk exhaustion)
echo "Step 4: Configuring Docker Daemon Log Rotation..."
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
sudo systemctl restart docker || true

echo "================================================================================"
echo "✅ Server provisioning complete!"
echo "👉 Place your docker-compose.prod.yml, .env.production and docker/ in $APP_DIR"
echo "👉 Run 'bash docker/init-ssl.sh' to bootstrap your SSL certificate."
echo "================================================================================"

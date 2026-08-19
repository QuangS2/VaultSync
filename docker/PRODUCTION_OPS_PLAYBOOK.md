# VaultSync — Cẩm Nang Vận Hành & Gia Cố Bảo Mật Máy Chủ Production (Ops Playbook)

> **Tiêu chuẩn kỹ thuật:** Cấp độ 11/10 Doanh nghiệp  
> **Môi trường mục tiêu:** 1 Máy chủ Ubuntu 22.04 / 24.04 LTS (Docker Engine + Domain Thật + Nginx SSL Auto Let's Encrypt)

---

## 📑 Mục Lục
1. [Chuẩn Bị Tên Miền (DNS Configuration)](#1-chuẩn-bị-tên-miền-dns-configuration)
2. [Gia Cố Bảo Mật Máy Chủ Ubuntu (Host Hardening)](#2-gia-cố-bảo-mật-máy-chủ-ubuntu-host-hardening)
3. [Thiết Lập Docker Daemon & Chống Đầy Ổ Cứng](#3-thiết-lập-docker-daemon--chống-đầy-ổ-cứng)
4. [Khởi Tạo Hệ Thống & Cấp Phát SSL Let's Encrypt Lần Đầu](#4-khởi-tạo-hệ-thống--cấp-phát-ssl-lets-encrypt-lần-đầu)
5. [Cấu Hình GitHub Secrets Cho CI/CD Tự Động](#5-cấu-hình-github-secrets-cho-cicd-tự-động)
6. [Kịch Bản Giám Sát Sức Khỏe & Tài Nguyên (Monitoring)](#6-kịch-bản-giám-sát-sức-khỏe--tài-nguyên-monitoring)
7. [Kịch Bản Sao Lưu & Khôi Phục Thảm Họa (Disaster Recovery)](#7-kịch-bản-sao-lưu--khôi-phục-thảm-họa-disaster-recovery)
8. [Quy Trình Xử Lý Sự Cố & Rollback Tức Thì (Incident Response)](#8-quy-trình-xử-lý-sự-cố--rollback-tức-thì-incident-response)

---

## 1. Chuẩn Bị Tên Miền (DNS Configuration)

Trước khi khởi chạy SSL, hãy cấu hình bản ghi DNS tại nhà cung cấp tên miền của bạn (Cloudflare, Namecheap, v.v.):

| Loại Bản Ghi (Type) | Tên Máy Chủ (Host / Name) | Giá Trị (Value) | TTL |
| :--- | :--- | :--- | :--- |
| **A Record** | `vaultsync` (hoặc `@` cho root domain) | `IP_MÁY_CHỦ_UBUNTU_CỦA_BẠN` | Auto / 300s |

> 💡 **Kiểm tra DNS trỏ thành công:**
> ```bash
> ping vaultsync.yourdomain.com
> ```

---

## 2. Gia Cố Bảo Mật Máy Chủ Ubuntu (Host Hardening)

### Bước 2.1: Chạy Script Khởi Tạo Tự Động
Tải mã nguồn hoặc copy thư mục `docker/` lên thư mục `/opt/vaultsync`:
```bash
cd /opt/vaultsync
bash docker/setup-ubuntu-server.sh
```

### Bước 2.2: Tắt Đăng Nhập Mật Khẩu SSH (Chỉ dùng SSH Key)
Mở file cấu hình SSH:
```bash
sudo nano /etc/ssh/sshd_config
```
Đảm bảo các giá trị sau được thiết lập:
```text
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
```
Khởi động lại dịch vụ SSH:
```bash
sudo systemctl restart sshd
```

### Bước 2.3: Bật Tường Lửa UFW Chặn Mọi Cổng Lạ
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP ACME Challenge'
sudo ufw allow 443/tcp comment 'HTTPS & WSS'
sudo ufw enable
```

---

## 3. Thiết Lập Docker Daemon & Chống Đầy Ổ Cứng

Để ngăn chặn việc container log ghi quá nhiều làm đầy ổ đĩa VPS, cấu hình xoay vòng log tại `/etc/docker/daemon.json`:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```
Khởi động lại Docker:
```bash
sudo systemctl restart docker
```

---

## 4. Khởi Tạo Hệ Thống & Cấp Phát SSL Let's Encrypt Lần Đầu

1. Copy file mẫu `.env.production` vào thư mục `/opt/vaultsync`:
   ```bash
   cd /opt/vaultsync
   cp .env.example .env.production
   nano .env.production
   ```
2. Cập nhật các giá trị thật:
   - `DOMAIN_NAME=vaultsync.yourdomain.com`
   - `LETSENCRYPT_EMAIL=your-email@gmail.com`
   - `REDIS_PASSWORD=sinh_mot_chuoi_mat_khau_ngau_nhien_dai_o_day`
3. Chạy kịch bản khởi tạo chứng chỉ SSL Let's Encrypt:
   ```bash
   bash docker/init-ssl.sh
   ```
4. Sau khi script hoàn tất, truy cập `https://vaultsync.yourdomain.com` để tận hưởng hệ thống VaultSync hoạt động trực tiếp!

---

## 5. Cấu Hình GitHub Secrets Cho CI/CD Tự Động

Để kích hoạt tính năng tự động Deploy mỗi khi merge code vào nhánh `main`, truy cập vào Repository GitHub của bạn:
👉 **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions** $\rightarrow$ Thêm 4 Secrets:

1. `SERVER_HOST`: Địa chỉ IP của máy chủ Ubuntu (vd: `123.45.67.89`).
2. `SERVER_USER`: Tên user SSH (vd: `ubuntu` hoặc `root`).
3. `SSH_PRIVATE_KEY`: Toàn bộ nội dung file Private Key SSH (`id_ed25519` hoặc `id_rsa`).
4. `SERVER_PORT`: `22` (hoặc cổng SSH tùy chỉnh của bạn).

---

## 6. Kịch Bản Giám Sát Sức Khỏe & Tài Nguyên (Monitoring)

Chạy kiểm tra tình trạng tức thì:
```bash
bash /opt/vaultsync/docker/health-monitor.sh
```

Cấu hình Cronjob tự động kiểm tra và ghi log mỗi giờ:
```bash
crontab -e
```
Thêm dòng sau:
```text
0 * * * * /bin/bash /opt/vaultsync/docker/health-monitor.sh >> /var/log/vaultsync-health.log 2>&1
```

---

## 7. Kịch Bản Sao Lưu & Khôi Phục Thảm Họa (Disaster Recovery)

### Tự động Sao Lưu Hàng Ngày (Cronjob):
Thêm vào `crontab -e`:
```text
0 3 * * * /bin/bash /opt/vaultsync/docker/backup-vaultsync.sh >> /var/log/vaultsync-backup.log 2>&1
```
Bản sao lưu sẽ được lưu tại `/opt/vaultsync/backups/vaultsync_backup_YYYYMMDD_HHMMSS.tar.gz` với cơ chế xoay vòng 14 ngày.

### Quy Trình Khôi Phục Từ File Backup:
```bash
cd /opt/vaultsync
# Dừng stack hiện tại
docker compose -f docker-compose.prod.yml down

# Giải nén đè lại volume
docker run --rm \
  -v vaultsync_production_redis_prod_data:/redis_data \
  -v vaultsync_production_certbot_conf:/letsencrypt_data \
  -v /opt/vaultsync/backups:/backup \
  alpine tar -xzf "/backup/TÊN_FILE_BACKUP.tar.gz" -C /

# Khởi động lại stack
docker compose -f docker-compose.prod.yml up -d
```

---

## 8. Quy Trình Xử Lý Sự Cố & Rollback Tức Thì (Incident Response)

### Rollback Ngay Lập Tức Sang Bản Build Cũ:
Nếu bản release mới gặp lỗi ngoài ý muốn, chỉ cần sửa tag trong `.env.production`:
```bash
nano .env.production
# Sửa IMAGE_TAG=sha-commit_cũ
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```
⏱️ **Thời gian rollback: dưới 3 giây** mà không cần build lại.

### Xem Log Thời Gian Thực:
```bash
# Xem log WebSocket Relay Server:
docker logs -f vaultsync-relay-prod

# Xem log Gateway Nginx:
docker logs -f vaultsync-gateway-prod
```
*Ghi chú bảo mật:* Log được thiết kế theo quy tắc **Zero-Leak Logging**, hoàn toàn không chứa plaintext hay byte khóa cryptographic của người dùng.

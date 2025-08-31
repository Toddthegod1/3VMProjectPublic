#!/usr/bin/env bash
set -e
DB_HOST="$1"
DB_NAME="$2"
DB_USER="$3"
DB_PASS="$4"

curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs build-essential jq curl

mkdir -p /opt/api
rsync -a /vagrant/api/ /opt/api/
cd /opt/api
npm install

cat >/opt/api/.env <<EOF
PORT=3000
DB_HOST=$DB_HOST
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASS=$DB_PASS
EOF

cat >/etc/systemd/system/finance-api.service <<'EOF'
[Unit]
Description=Finance API
After=network.target

[Service]
EnvironmentFile=/opt/api/.env
WorkingDirectory=/opt/api
ExecStart=/usr/bin/node /opt/api/server.js
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable finance-api
systemctl restart finance-api
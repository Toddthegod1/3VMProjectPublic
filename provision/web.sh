#!/usr/bin/env bash
set -e
API_HOST="$1"

apt-get install -y nginx

mkdir -p /var/www/finance
rsync -a /vagrant/web/ /var/www/finance/

sed -i "s|__API_BASE__|http://$API_HOST:3000|g" /var/www/finance/app.js

cat >/etc/nginx/sites-available/finance <<'EOF'
server {
listen 80 default_server;
root /var/www/finance;
index index.html;
server_name _;
location / {
try_files $uri $uri/ =404;
}
}
EOF

ln -sf /etc/nginx/sites-available/finance /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

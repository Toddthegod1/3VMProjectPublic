#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y postgresql postgresql-contrib

PG_VER="$(ls /etc/postgresql | sort -V | tail -n1)"
CONF="/etc/postgresql/${PG_VER}/main/postgresql.conf"
HBA="/etc/postgresql/${PG_VER}/main/pg_hba.conf"

sed -i -E "s/^#?\s*listen_addresses\s*=.*/listen_addresses = '*'/" "$CONF"

grep -q "192.168.56.0/24" "$HBA" || \
  echo "host all all 192.168.56.0/24 scram-sha-256" | tee -a "$HBA" >/dev/null

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER SYSTEM SET password_encryption='scram-sha-256';" || true

systemctl restart "postgresql@${PG_VER}-main" || systemctl restart postgresql
systemctl enable postgresql >/dev/null 2>&1 || true

sudo -u postgres psql -Atqc "SELECT 1 FROM pg_roles WHERE rolname='finance_user';" | grep -q 1 || \
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER finance_user WITH PASSWORD 'finance_pass';"

if ! sudo -u postgres psql -Atqc "SELECT 1 FROM pg_database WHERE datname='finance_db';" | grep -q 1; then
  sudo -u postgres createdb -O finance_user finance_db
fi

[ -f /vagrant/db/init.sql ] && sudo -u postgres psql -v ON_ERROR_STOP=1 -d finance_db -f /vagrant/db/init.sql || true
[ -f /vagrant/db/seed.sql ] && sudo -u postgres psql -v ON_ERROR_STOP=1 -d finance_db -f /vagrant/db/seed.sql || true

sudo -u postgres psql -v ON_ERROR_STOP=1 -d finance_db -c "ALTER SCHEMA public OWNER TO finance_user;"

sudo -u postgres psql -v ON_ERROR_STOP=1 -d finance_db -c "
DO \$\$
DECLARE r record;
BEGIN
  -- Tables
  FOR r IN SELECT format('%I.%I', schemaname, tablename) AS obj
           FROM pg_tables WHERE schemaname='public'
  LOOP
    EXECUTE 'ALTER TABLE '||r.obj||' OWNER TO finance_user';
  END LOOP;

  -- Sequences
  FOR r IN SELECT format('%I.%I', sequence_schema, sequence_name) AS obj
           FROM information_schema.sequences WHERE sequence_schema='public'
  LOOP
    EXECUTE 'ALTER SEQUENCE '||r.obj||' OWNER TO finance_user';
  END LOOP;
END
\$\$;
"

sudo -u postgres psql -v ON_ERROR_STOP=1 -d finance_db -c "GRANT USAGE ON SCHEMA public TO finance_user;"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d finance_db -c "GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO finance_user;"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d finance_db -c "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO finance_user;"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d finance_db -c "
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO finance_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO finance_user;
"

ss -ltnp | grep 5432 || true


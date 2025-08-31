#!/usr/bin/env bash
set -e


API=http://192.168.56.11:3000


echo "1) API health:" && curl -s $API/health | jq .


echo "2) List transactions:" && curl -s $API/transactions | jq '.[0:5]'


echo "3) Add sample expense:" && curl -s -X POST $API/transactions \
-H 'Content-Type: application/json' \
-d '{"description":"Coffee","category":"eating out","t_type":"expense","amount":4.5}' | jq .


echo "4) Summary:" && curl -s $API/summary | jq .


echo "Open the web UI at: http://192.168.56.12/"
#!/bin/bash
cd "$(dirname "$0")"

# Start server in background
node src/server.js &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to be ready
for i in {1..15}; do
  if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "Server ready"
    break
  fi
  sleep 1
done

echo ""
echo "=== RESET AND SEED ==="
curl -s -X POST http://localhost:5000/api/demo/reset-and-seed
echo ""

echo ""
echo "=== WORSENING SCENARIO ==="
curl -s -X POST http://localhost:5000/api/demo/scenario/worsening
echo ""

echo ""
echo "=== DEMO STATUS ==="
curl -s http://localhost:5000/api/demo/status
echo ""

echo ""
echo "=== CARE PLAN CHECK ==="
PATIENT_ID=$(curl -s http://localhost:5000/api/patients | python -c "import sys,json; d=json.load(sys.stdin); print(d['patients'][0]['_id'])")
curl -s "http://localhost:5000/api/care-plans/patient/${PATIENT_ID}"
echo ""

echo ""
echo "=== AGENT EVENTS ==="
curl -s "http://localhost:5000/api/agent/events?limit=15"
echo ""

# Kill server
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
echo "DONE"

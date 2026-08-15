#!/bin/sh
set -e
# Start FastAPI backend on 8000 and Vite dev on $PORT (injected by Freebuff)
# Keep both alive; trap exits
echo "[start] launching ClaimDefense API on 127.0.0.1:8000 ..."
python3 -m uvicorn api.index:app --host 127.0.0.1 --port 8000 &
API_PID=$!
# wait a moment for API to bind
sleep 2
echo "[start] launching Vite on 0.0.0.0:\$PORT (proxying /api -> 127.0.0.1:8000) ..."
# Vite reads PORT env var already; freebuff-preview injects it. Fallback to 5173
if [ -z "$PORT" ]; then
  export PORT=5173
fi
# Rewrite vite port via env: Vite server.port is 5173 but proxy target fixed; we make vite listen on $PORT via --port
npx vite --host 0.0.0.0 --port "$PORT" --strictPort &
VITE_PID=$!
wait $API_PID $VITE_PID

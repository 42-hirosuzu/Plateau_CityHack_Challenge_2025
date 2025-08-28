# my-orchestrator

Minimal JSON ingest server (Node + Express) and Windows test clients.

## Quick Start

```bash
npm install
npm run start   # or: npm run dev
# open another terminal:
node -e 'fetch("http://localhost:3000/health").then(r=>r.json()).then(console.log)'
```

## Test with provided payload

From repo root:

- **Windows CMD**:
  ```
  test\send-curl.cmd
  ```

- **PowerShell**:
  ```
  ./test/send.ps1
  ```

- **curl (Linux/macOS/WSL)**:
  ```
  curl -s -X POST http://localhost:3000/ingest \
    -H "Content-Type: application/json" \
    --data-binary @test/data.json
  ```

## Endpoints

- `GET /health`  → `{ ok: true, ts }`
- `POST /ingest` → echoes received JSON

## Notes

- Server port: `PORT` env var or `3000` by default.
- CORS: permissive (for quick experiments). Tighten for production.

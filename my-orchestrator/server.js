/**
 * Minimal JSON ingest server
 */
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON
app.use(express.json({ limit: '5mb' }));

// Very simple CORS (useful if calling from a browser)
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Ingest endpoint
app.post('/ingest', (req, res) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] /ingest received:`, JSON.stringify(req.body));
  res.json({ ok: true, received: req.body, ts });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

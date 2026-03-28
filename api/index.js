import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('olla-machina.db');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Initialize DB schema
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    fingerprint JSON NOT NULL,
    fingerprint_id TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS benchmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id TEXT,
    quant_level TEXT,
    gpu_model TEXT,
    throughput_tps REAL,
    latency_ms INTEGER,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// API Routes
app.get('/api/benchmarks', (req, res) => {
  const modelId = req.query.modelId;
  let query = 'SELECT * FROM benchmarks';
  let params = [];
  
  if (modelId) {
    query += ' WHERE model_id = ?';
    params.push(modelId);
  }
  
  const benchmarks = db.prepare(query).all(...params);
  res.json(benchmarks);
});

app.post('/api/subscriptions', (req, res) => {
  const { email, fingerprint, fingerprint_id } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO subscriptions (email, fingerprint, fingerprint_id) VALUES (?, ?, ?)');
    stmt.run(email, JSON.stringify(fingerprint), fingerprint_id);
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Already subscribed' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.listen(port, () => {
  console.log(`OllamaFit local API listening at http://localhost:${port}`);
});

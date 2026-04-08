import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import path from 'path'

const db = new Database(process.env.DB_PATH || './data/haven.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS intents (
    id           TEXT PRIMARY KEY,
    agent_id     TEXT NOT NULL,
    recipient    TEXT NOT NULL,
    amount       TEXT NOT NULL,
    task_tag     TEXT NOT NULL,
    task_id      TEXT NOT NULL,
    nonce        INTEGER NOT NULL,
    state        TEXT NOT NULL DEFAULT 'PENDING',
    fw_decision  TEXT,
    fw_reason    TEXT,
    risk_score   REAL,
    risk_level   TEXT,
    tx_hash      TEXT,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
  )
`)

export function createIntent(data) {
  const id  = randomUUID()
  const now = Date.now()
  db.prepare(`
    INSERT INTO intents
      (id, agent_id, recipient, amount, task_tag, task_id, nonce, state, created_at, updated_at)
    VALUES
      (@id, @agent_id, @recipient, @amount, @task_tag, @task_id, @nonce, 'PENDING', @now, @now)
  `).run({ ...data, id, now })
  return getIntent(id)
}

export function getIntent(id) {
  return db.prepare('SELECT * FROM intents WHERE id = ?').get(id) ?? null
}

export function updateIntent(id, fields) {
  const now     = Date.now()
  const allowed = ['state', 'fw_decision', 'fw_reason', 'risk_score', 'risk_level', 'tx_hash']
  const updates = Object.keys(fields)
    .filter(k => allowed.includes(k))
    .map(k => `${k} = @${k}`)
    .join(', ')
  db.prepare(`UPDATE intents SET ${updates}, updated_at = @now WHERE id = @id`)
    .run({ ...fields, now, id })
  return getIntent(id)
}

export function listIntents(agent_id) {
  return db.prepare('SELECT * FROM intents WHERE agent_id = ? ORDER BY created_at DESC').all(agent_id)
}

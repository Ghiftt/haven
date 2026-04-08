import Database from 'better-sqlite3'
import { createHash } from 'crypto'

function getDb() {
  const db = new Database(process.env.DB_PATH || './data/haven.db')
  db.exec(`
    CREATE TABLE IF NOT EXISTS log (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp    INTEGER NOT NULL,
      event_type   TEXT NOT NULL,
      task_id      TEXT NOT NULL,
      payload      TEXT NOT NULL,
      prev_hash    TEXT NOT NULL,
      current_hash TEXT NOT NULL
    )
  `)
  return db
}

function stableStringify(obj) {
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj)
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']'
  return '{' + Object.keys(obj).sort().map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}

function computeHash(prevHash, id, timestamp, eventType, payload) {
  return createHash('sha256')
    .update(prevHash + id + timestamp + eventType + stableStringify(payload))
    .digest('hex')
}

export async function append(event_type, task_id, payload) {
  try {
    const db        = getDb()
    const timestamp = Date.now()

    const last = db.prepare(
      'SELECT id, current_hash FROM log ORDER BY id DESC LIMIT 1'
    ).get()

    const prev_hash = last ? last.current_hash : '0'.repeat(64)
    const next_id   = last ? last.id + 1 : 1

    const current_hash = computeHash(prev_hash, next_id, timestamp, event_type, payload)

    db.prepare(`
      INSERT INTO log (timestamp, event_type, task_id, payload, prev_hash, current_hash)
      VALUES (@timestamp, @event_type, @task_id, @payload, @prev_hash, @current_hash)
    `).run({
      timestamp,
      event_type,
      task_id,
      payload:      stableStringify(payload),
      prev_hash,
      current_hash,
    })

    db.close()
    return { event_type, task_id, timestamp, current_hash }
  } catch (err) {
    console.error('LOG ERROR:', err.message)
  }
}

export async function getLog(task_id) {
  const db      = getDb()
  const entries = task_id
    ? db.prepare('SELECT * FROM log WHERE task_id = ? ORDER BY id ASC').all(task_id)
    : db.prepare('SELECT * FROM log ORDER BY id ASC').all()
  db.close()
  return entries.map(e => {
    const parsed = JSON.parse(e.payload)
    const entry  = { ...e, payload: parsed }
    if (parsed.tx_hash) {
      entry.explorer_url = `https://testnet.kitescan.ai/tx/${parsed.tx_hash}`
    }
    return entry
  })
}

export async function verifyChain() {
  const db      = getDb()
  const entries = db.prepare('SELECT * FROM log ORDER BY id ASC').all()
  db.close()

  for (let i = 1; i < entries.length; i++) {
    const e        = entries[i]
    const expected = computeHash(
      entries[i - 1].current_hash,
      e.id,
      e.timestamp,
      e.event_type,
      JSON.parse(e.payload)
    )
    if (e.current_hash !== expected) {
      return { valid: false, tampered_at: e.id, event_type: e.event_type }
    }
  }
  return { valid: true, entries: entries.length }
}

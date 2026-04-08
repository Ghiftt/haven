import Database from 'better-sqlite3'

function getDb() {
  return new Database(process.env.DB_PATH || './data/haven.db')
}

export async function score(intent) {
  const db      = getDb()
  const agentId = intent.agent_id
  const amount  = Number(intent.amount)
  const now     = Date.now()
  const oneHour = 60 * 60 * 1000

  const history = db.prepare(`
    SELECT * FROM intents
    WHERE agent_id = ? AND state IN ('APPROVED', 'EXECUTED')
    ORDER BY created_at DESC
  `).all(agentId)

  let score   = 0.0
  const reasons = []

  // 1. Recipient novelty — never paid this recipient before
  const seenRecipients = new Set(history.map(h => h.recipient.toLowerCase()))
  if (!seenRecipients.has(intent.recipient.toLowerCase())) {
    score += 0.30
    reasons.push('recipient_never_seen')
  }

  // 2. Amount deviation — more than 1.5x average historical amount
  if (history.length > 0) {
    const avg = history.reduce((sum, h) => sum + Number(h.amount), 0) / history.length
    if (amount > avg * 1.5) {
      score += 0.25
      reasons.push('amount_above_average')
    }
  }

  // 3. Frequency — more than 5 intents in the last hour
  const recentCount = db.prepare(`
    SELECT COUNT(*) as count FROM intents
    WHERE agent_id = ? AND created_at > ?
  `).get(agentId, now - oneHour).count
  if (recentCount > 5) {
    score += 0.20
    reasons.push('high_frequency')
  }

  // 4. Firewall flags present on this intent
  if (intent.flags && intent.flags.length > 0) {
    score += 0.15
    reasons.push('firewall_flags_present')
  }

  // 5. Off hours — outside 6am to 10pm local time
  const hour = new Date(now).getHours()
  if (hour < 6 || hour >= 22) {
    score += 0.10
    reasons.push('off_hours')
  }

  score = Math.min(score, 1.0)

  const risk_level = score < 0.3 ? 'LOW' : score < 0.6 ? 'MEDIUM' : 'HIGH'

  db.close()
  return { risk_score: Math.round(score * 100) / 100, risk_level, reasons }
}

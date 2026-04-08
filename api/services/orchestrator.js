import * as firewall    from './firewall.js'
import * as mlSignal    from './mlSignal.js'
import * as vault       from './vault.js'
import * as logService  from './logService.js'
import * as intentStore from './intentStore.js'

export async function createIntent(raw) {
  const required = ['agent_id', 'recipient', 'amount', 'task_tag', 'task_id', 'nonce']
  for (const k of required) {
    if (!(k in raw)) throw new Error(`Missing field: ${k}`)
  }

  const intent = intentStore.createIntent({
    agent_id:  raw.agent_id,
    recipient: raw.recipient,
    amount:    raw.amount.toString(),
    task_tag:  raw.task_tag,
    task_id:   raw.task_id,
    nonce:     raw.nonce,
  })

  await logService.append('INTENT_CREATED', intent.id, intent)
  return intent
}

export async function reviewIntent(intentId) {
  const intent = intentStore.getIntent(intentId)
  if (!intent) throw new Error(`Intent ${intentId} not found`)
  if (intent.state !== 'PENDING') throw new Error(`Intent is already ${intent.state}`)

  const fw = await firewall.check(intent)
  const ml = await mlSignal.score(intent)

  const newState = (fw.decision === 'APPROVE' && ml.risk_level !== 'HIGH')
    ? 'APPROVED'
    : 'BLOCKED'

  const updated = intentStore.updateIntent(intentId, {
    state:      newState,
    fw_decision: fw.decision,
    fw_reason:   fw.reason ?? null,
    risk_score:  ml.risk_score,
    risk_level:  ml.risk_level,
  })

  await logService.append(`INTENT_${newState}`, intentId, {
    fw_decision: fw.decision,
    fw_reason:   fw.reason,
    risk_score:  ml.risk_score,
    risk_level:  ml.risk_level,
  })

  return {
    intentId,
    state:      newState,
    fw_decision: fw.decision,
    fw_reason:   fw.reason ?? null,
    risk_score:  ml.risk_score,
    risk_level:  ml.risk_level,
    approval_artifact: newState === 'APPROVED' ? fw.approval_artifact : null,
  }
}

export async function executePayment(intentId) {
  const intent = intentStore.getIntent(intentId)
  if (!intent) throw new Error(`Intent ${intentId} not found`)
  if (intent.state !== 'APPROVED') throw new Error(`Intent is ${intent.state} — only APPROVED intents can be executed`)

  const fw = await firewall.check(intent)
  if (fw.decision !== 'APPROVE') throw new Error('Firewall recheck failed')

  let amount = intent.amount
  const ml   = await mlSignal.score(intent)
  if (ml.risk_level === 'MEDIUM') amount = (BigInt(amount) / 2n).toString()

  const tx = await vault.execute({ ...intent, amount }, fw.approval_artifact)

  const updated = intentStore.updateIntent(intentId, {
    state:    'EXECUTED',
    tx_hash:  tx.hash,
  })

  await logService.append('INTENT_EXECUTED', intentId, { tx_hash: tx.hash })

  return { intentId, state: 'EXECUTED', tx_hash: tx.hash }
}

import { ethers } from 'ethers'
import { getPolicy } from './policyStore.js'

const INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /disregard (your |all )?instructions/i,
  /you are now/i,
  /act as (if you are|a )?/i,
  /system:\s/i,
  /\bsudo\b/i,
]

export async function check(intent) {
  if (!isValidSchema(intent)) {
    return block('malformed_input', 'Required fields missing or wrong type')
  }

  const policy = await getPolicy(intent.agent_id)
  if (!policy) {
    return block('no_policy', `No policy found for agent ${intent.agent_id}`)
  }

  const recipientLower = intent.recipient.toLowerCase()
  const allowed = policy.recipients.map(r => r.toLowerCase())
  if (!allowed.includes(recipientLower)) {
    return block('recipient_not_allowed', `${intent.recipient} not in allowlist`)
  }

  const amount = BigInt(intent.amount)
  const cap    = BigInt(policy.spend_cap)
  if (amount > cap) {
    return block('amount_exceeds_cap', `${intent.amount} exceeds cap of ${policy.spend_cap}`)
  }

  const ALLOWED_TASKS = ['invoice_payment', 'subscription', 'vendor_payment', 'refund']
  if (!ALLOWED_TASKS.includes(intent.task_tag)) {
    return block('task_not_allowed', `Task tag "${intent.task_tag}" not recognised`)
  }

  const scanTarget = JSON.stringify(intent)
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(scanTarget)) {
      return block('injection_detected', `Matched pattern: ${pattern}`)
    }
  }

  const artifact = buildArtifact(intent)
  return { decision: 'APPROVE', reason: null, flags: [], approval_artifact: artifact }
}

function isValidSchema(intent) {
  const required = ['agent_id', 'recipient', 'amount', 'task_tag', 'task_id', 'nonce']
  if (!required.every(k => k in intent)) return false
  if (typeof intent.amount !== 'string') return false
  if (!/^0x[0-9a-fA-F]{40}$/.test(intent.recipient)) return false
  return true
}

function buildArtifact(intent) {
  const signer  = new ethers.Wallet(process.env.HAVEN_SIGNER_KEY)
  const expiry  = Math.floor(Date.now() / 1000) + 3600

  // Step 1 — build intentHash the same way the contract does
  const intentHash = ethers.solidityPackedKeccak256(
    ['address', 'address', 'uint256', 'string', 'uint256', 'uint256'],
    [intent.agent_id, intent.recipient, intent.amount,
     intent.task_id, intent.nonce, expiry]
  )

  // Step 2 — build messageHash exactly as the contract does
  // keccak256(abi.encodePacked(intentHash, agent, recipient, amount, expiry))
  const messageHash = ethers.solidityPackedKeccak256(
    ['bytes32', 'address', 'address', 'uint256', 'uint256'],
    [intentHash, intent.agent_id, intent.recipient, intent.amount, expiry]
  )

  // Step 3 — sign the messageHash with Ethereum prefix (matches contract's ethSignedHash)
  const signature = signer.signMessageSync(ethers.getBytes(messageHash))

  return {
    intent_hash: intentHash,
    recipient:   intent.recipient,
    amount:      intent.amount,
    expiry,
    signature,
  }
}

function block(reason, detail) {
  return { decision: 'BLOCK', reason, detail, flags: [reason], approval_artifact: null }
}

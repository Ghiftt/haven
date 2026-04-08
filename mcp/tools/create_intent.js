export const schema = {
  name: 'create_intent',
  description: 'Create a new payment intent. Returns intentId and PENDING state.',
  inputSchema: {
    type: 'object',
    required: ['agent_id', 'recipient', 'amount', 'task_tag', 'task_id', 'nonce'],
    properties: {
      agent_id:  { type: 'string', description: 'Agent wallet address' },
      recipient: { type: 'string', description: 'Recipient wallet address' },
      amount:    { type: 'string', description: 'Amount in USDC base units (6 decimals)' },
      task_tag:  { type: 'string', description: 'invoice_payment | subscription | vendor_payment | refund' },
      task_id:   { type: 'string', description: 'Unique task identifier' },
      nonce:     { type: 'number', description: 'Replay protection nonce' },
    }
  }
}

export async function handler(params, apiBase) {
  const res = await fetch(`${apiBase}/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return res.json()
}

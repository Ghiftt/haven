export const schema = {
  name: 'get_tx_status',
  description: 'Get current status of a payment intent. Returns state: PENDING | APPROVED | BLOCKED | EXECUTED.',
  inputSchema: {
    type: 'object',
    required: ['intentId'],
    properties: {
      intentId: { type: 'string', description: 'Intent ID to check' },
    }
  }
}

export async function handler(params, apiBase) {
  const res = await fetch(`${apiBase}/tx/${params.intentId}`)
  return res.json()
}

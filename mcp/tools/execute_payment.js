export const schema = {
  name: 'execute_payment',
  description: 'Execute an APPROVED intent. Triggers vault payment and records tx hash. Only works if intent state is APPROVED.',
  inputSchema: {
    type: 'object',
    required: ['intentId'],
    properties: {
      intentId: { type: 'string', description: 'Intent ID of an APPROVED intent' },
    }
  }
}

export async function handler(params, apiBase) {
  const res = await fetch(`${apiBase}/payment/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intentId: params.intentId }),
  })
  return res.json()
}

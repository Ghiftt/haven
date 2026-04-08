export const schema = {
  name: 'review_intent',
  description: 'Run firewall, ML risk signal, and policy checks on a PENDING intent. Returns APPROVED or BLOCKED with reasons.',
  inputSchema: {
    type: 'object',
    required: ['intentId'],
    properties: {
      intentId: { type: 'string', description: 'Intent ID returned from create_intent' },
    }
  }
}

export async function handler(params, apiBase) {
  const res = await fetch(`${apiBase}/intent/${params.intentId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  return res.json()
}

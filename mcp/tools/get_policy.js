export const schema = {
  name: 'get_policy',
  description: 'Get current spend policy for an agent. Returns spend cap and allowlisted recipients.',
  inputSchema: {
    type: 'object',
    required: ['agent_id'],
    properties: {
      agent_id: { type: 'string', description: 'Agent wallet address' },
    }
  }
}

export async function handler(params, apiBase) {
  const res = await fetch(`${apiBase}/policy/${params.agent_id}`)
  return res.json()
}

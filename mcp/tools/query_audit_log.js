export const schema = {
  name: 'query_audit_log',
  description: 'Query the audit log. Returns all recorded events for traceability.',
  inputSchema: {
    type: 'object',
    properties: {
      intentId: { type: 'string', description: 'Filter by intent ID (optional)' },
    }
  }
}

export async function handler(params, apiBase) {
  const url = params.intentId
    ? `${apiBase}/audit/log?intentId=${params.intentId}`
    : `${apiBase}/audit/log`
  const res = await fetch(url)
  return res.json()
}

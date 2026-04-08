const policies = new Map()

export function setPolicy(agentId, { recipients, spend_cap }) {
  policies.set(agentId.toLowerCase(), {
    recipients: recipients.map(r => r.toLowerCase()),
    spend_cap: spend_cap.toString(),
  })
}

export function getPolicy(agentId) {
  return policies.get(agentId.toLowerCase()) ?? null
}

export function removeRecipient(agentId, recipient) {
  const p = policies.get(agentId.toLowerCase())
  if (!p) return false
  p.recipients = p.recipients.filter(r => r !== recipient.toLowerCase())
  return true
}

// Real deployer address on Kite testnet
setPolicy('0x337e60D21f2FB8944c4bA7851C3C1E01daD2ac13', {
  recipients: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8'],
  spend_cap:  '1000000000',
})

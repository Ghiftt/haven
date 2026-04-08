import { ethers } from 'ethers'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const VaultABI = require('../../artifacts/contracts/VaultContract.sol/VaultContract.json')

function getContract() {
  const provider = new ethers.JsonRpcProvider(process.env.KITE_RPC_URL)
  const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  return new ethers.Contract(process.env.CONTRACT_VAULT, VaultABI.abi, wallet)
}

export async function execute(intent, artifact) {
  const contract = getContract()
  const tx = await contract.executePayment(
    artifact.intent_hash,
    intent.agent_id,
    artifact.recipient,
    artifact.amount,
    artifact.expiry,
    artifact.signature,
  )
  const receipt = await tx.wait()
  return { hash: receipt.hash }
}

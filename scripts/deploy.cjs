const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. Deploy MockERC20
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  console.log("MockERC20 (USDC):", await usdc.getAddress());

  // 2. Deploy PaymentGate
  const PaymentGate = await ethers.getContractFactory("PaymentGate");
  const gate = await PaymentGate.deploy();
  await gate.waitForDeployment();
  console.log("PaymentGate:", await gate.getAddress());

  // 3. Deploy VaultContract
  const VaultContract = await ethers.getContractFactory("VaultContract");
  const vault = await VaultContract.deploy(
    await usdc.getAddress(),
    await gate.getAddress(),
    deployer.address
  );
  await vault.waitForDeployment();
  console.log("VaultContract:", await vault.getAddress());

  // 4. Set demo policy on PaymentGate
  await gate.setPolicy(
    deployer.address,
    ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8"],
    ethers.parseUnits("1000", 6)
  );
  console.log("Policy set on PaymentGate");

  console.log("\n--- Copy these into your .env ---");
  console.log("CONTRACT_USDC=" + await usdc.getAddress());
  console.log("CONTRACT_PAYMENT_GATE=" + await gate.getAddress());
  console.log("CONTRACT_VAULT=" + await vault.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

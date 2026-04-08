const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const usdc  = await ethers.getContractAt("MockERC20", process.env.CONTRACT_USDC);
  const vault = await ethers.getContractAt("VaultContract", process.env.CONTRACT_VAULT);

  // Mint 10,000 USDC to deployer
  const mintAmount = ethers.parseUnits("10000", 6);
  await usdc.mint(deployer.address, mintAmount);
  console.log("Minted 10,000 USDC to", deployer.address);

  // Approve vault to spend
  await usdc.approve(process.env.CONTRACT_VAULT, mintAmount);
  console.log("Approved vault");

  // Deposit into vault
  await vault.deposit(mintAmount);
  console.log("Deposited 10,000 USDC into vault");

  // Check balance
  const balance = await vault.balances(deployer.address);
  console.log("Vault balance:", ethers.formatUnits(balance, 6), "USDC");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

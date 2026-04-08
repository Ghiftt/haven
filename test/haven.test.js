const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HAVEN", function () {
  let usdc, paymentGate, vault;
  let owner, agent, recipient, stranger;
  let havenSigner;

  const USDC_DECIMALS = 6;
  const ONE_USDC = ethers.parseUnits("1", USDC_DECIMALS);
  const FIFTY_USDC = ethers.parseUnits("50", USDC_DECIMALS);
  const HUNDRED_USDC = ethers.parseUnits("100", USDC_DECIMALS);

  async function signIntent(signer, intentHash, agent, recipient, amount, expiry) {
    const messageHash = ethers.solidityPackedKeccak256(
      ["bytes32", "address", "address", "uint256", "uint256"],
      [intentHash, agent, recipient, amount, expiry]
    );
    return await signer.signMessage(ethers.getBytes(messageHash));
  }

  beforeEach(async function () {
    [owner, agent, recipient, stranger] = await ethers.getSigners();
    havenSigner = owner;

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

    const PaymentGate = await ethers.getContractFactory("PaymentGate");
    paymentGate = await PaymentGate.deploy();

    const VaultContract = await ethers.getContractFactory("VaultContract");
    vault = await VaultContract.deploy(
      await usdc.getAddress(),
      await paymentGate.getAddress(),
      havenSigner.address
    );

    await usdc.mint(agent.address, HUNDRED_USDC);
    await usdc.connect(agent).approve(await vault.getAddress(), HUNDRED_USDC);
    await paymentGate.setPolicy(agent.address, [recipient.address], FIFTY_USDC);
  });

  it("agent can deposit USDC into vault", async function () {
    await vault.connect(agent).deposit(FIFTY_USDC);
    expect(await vault.balances(agent.address)).to.equal(FIFTY_USDC);
  });

  it("reverts on zero deposit", async function () {
    await expect(vault.connect(agent).deposit(0)).to.be.revertedWithCustomError(vault, "ZeroAmount");
  });

  it("executes valid payment with correct signature", async function () {
    await vault.connect(agent).deposit(FIFTY_USDC);
    const intentHash = ethers.keccak256(ethers.toUtf8Bytes("intent-001"));
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const sig = await signIntent(havenSigner, intentHash, agent.address, recipient.address, ONE_USDC, expiry);
    await expect(
      vault.executePayment(intentHash, agent.address, recipient.address, ONE_USDC, expiry, sig)
    ).to.emit(vault, "PaymentExecuted");
    expect(await vault.balances(agent.address)).to.equal(FIFTY_USDC - ONE_USDC);
    expect(await usdc.balanceOf(recipient.address)).to.equal(ONE_USDC);
  });

  it("marks intent as used after execution", async function () {
    await vault.connect(agent).deposit(FIFTY_USDC);
    const intentHash = ethers.keccak256(ethers.toUtf8Bytes("intent-002"));
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const sig = await signIntent(havenSigner, intentHash, agent.address, recipient.address, ONE_USDC, expiry);
    await vault.executePayment(intentHash, agent.address, recipient.address, ONE_USDC, expiry, sig);
    expect(await vault.usedIntents(intentHash)).to.equal(true);
  });

  it("blocks replay attack", async function () {
    await vault.connect(agent).deposit(FIFTY_USDC);
    const intentHash = ethers.keccak256(ethers.toUtf8Bytes("intent-003"));
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const sig = await signIntent(havenSigner, intentHash, agent.address, recipient.address, ONE_USDC, expiry);
    await vault.executePayment(intentHash, agent.address, recipient.address, ONE_USDC, expiry, sig);
    await expect(
      vault.executePayment(intentHash, agent.address, recipient.address, ONE_USDC, expiry, sig)
    ).to.be.revertedWithCustomError(vault, "IntentAlreadyUsed");
  });

  it("blocks payment signed by wrong signer", async function () {
    await vault.connect(agent).deposit(FIFTY_USDC);
    const intentHash = ethers.keccak256(ethers.toUtf8Bytes("intent-004"));
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const sig = await signIntent(stranger, intentHash, agent.address, recipient.address, ONE_USDC, expiry);
    await expect(
      vault.executePayment(intentHash, agent.address, recipient.address, ONE_USDC, expiry, sig)
    ).to.be.revertedWithCustomError(vault, "InvalidSignature");
  });

  it("blocks expired intent", async function () {
    await vault.connect(agent).deposit(FIFTY_USDC);
    const intentHash = ethers.keccak256(ethers.toUtf8Bytes("intent-005"));
    const expiry = Math.floor(Date.now() / 1000) - 10;
    const sig = await signIntent(havenSigner, intentHash, agent.address, recipient.address, ONE_USDC, expiry);
    await expect(
      vault.executePayment(intentHash, agent.address, recipient.address, ONE_USDC, expiry, sig)
    ).to.be.revertedWithCustomError(vault, "IntentExpired");
  });

  it("blocks payment to non-allowlisted recipient", async function () {
    await vault.connect(agent).deposit(FIFTY_USDC);
    const intentHash = ethers.keccak256(ethers.toUtf8Bytes("intent-006"));
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const sig = await signIntent(havenSigner, intentHash, agent.address, stranger.address, ONE_USDC, expiry);
    await expect(
      vault.executePayment(intentHash, agent.address, stranger.address, ONE_USDC, expiry, sig)
    ).to.be.revertedWithCustomError(vault, "PolicyDenied");
  });

  it("blocks payment exceeding spend cap", async function () {
    await vault.connect(agent).deposit(HUNDRED_USDC);
    const overCap = ethers.parseUnits("51", USDC_DECIMALS);
    const intentHash = ethers.keccak256(ethers.toUtf8Bytes("intent-007"));
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const sig = await signIntent(havenSigner, intentHash, agent.address, recipient.address, overCap, expiry);
    await expect(
      vault.executePayment(intentHash, agent.address, recipient.address, overCap, expiry, sig)
    ).to.be.revertedWithCustomError(vault, "PolicyDenied");
  });

  it("blocks payment when insufficient balance", async function () {
    await vault.connect(agent).deposit(ONE_USDC);
    const intentHash = ethers.keccak256(ethers.toUtf8Bytes("intent-008"));
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const sig = await signIntent(havenSigner, intentHash, agent.address, recipient.address, FIFTY_USDC, expiry);
    await expect(
      vault.executePayment(intentHash, agent.address, recipient.address, FIFTY_USDC, expiry, sig)
    ).to.be.revertedWithCustomError(vault, "InsufficientBalance");
  });

  it("owner can update policy", async function () {
    await paymentGate.setPolicy(agent.address, [stranger.address], ONE_USDC);
    expect(await paymentGate.isAllowed(agent.address, stranger.address, ONE_USDC)).to.equal(true);
  });

  it("owner can remove recipient", async function () {
    await paymentGate.removeRecipient(agent.address, recipient.address);
    expect(await paymentGate.isAllowed(agent.address, recipient.address, ONE_USDC)).to.equal(false);
  });
});

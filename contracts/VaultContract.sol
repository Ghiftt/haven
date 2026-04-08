
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

interface IPaymentGate {

    function isAllowed(address agent, address recipient, uint256 amount) external view returns (bool);

}

contract VaultContract is ReentrancyGuard, Ownable {

    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    IPaymentGate public immutable paymentGate;

    address public immutable havenSigner;

    // agent => balance

    mapping(address => uint256) public balances;

    // replay protection — intentHash => used

    mapping(bytes32 => bool) public usedIntents;

    event Deposited(address indexed agent, uint256 amount);

    event PaymentExecuted(

        bytes32 indexed intentHash,

        address indexed agent,

        address indexed recipient,

        uint256 amount

    );

    event PaymentBlocked(

        bytes32 indexed intentHash,

        address indexed agent,

        string reason

    );

    error InvalidSignature();

    error IntentAlreadyUsed();

    error IntentExpired();

    error PolicyDenied();

    error InsufficientBalance();

    error ZeroAmount();

    constructor(address _usdc, address _paymentGate, address _havenSigner) Ownable(msg.sender) {

        usdc = IERC20(_usdc);

        paymentGate = IPaymentGate(_paymentGate);

        havenSigner = _havenSigner;

    }

    // Agent deposits USDC into their vault balance

    function deposit(uint256 amount) external nonReentrant {

        if (amount == 0) revert ZeroAmount();

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        balances[msg.sender] += amount;

        emit Deposited(msg.sender, amount);

    }

    // Execute a payment — called by agent, verified against HAVEN signer signature

    function executePayment(

        bytes32 intentHash,

        address agent,

        address recipient,

        uint256 amount,

        uint256 expiry,

        bytes calldata signature

    ) external nonReentrant {

        // 1. Expiry

        if (block.timestamp > expiry) revert IntentExpired();

        // 2. Replay protection

        if (usedIntents[intentHash]) revert IntentAlreadyUsed();

        // 3. Verify HAVEN signer approved this intent

        bytes32 messageHash = keccak256(abi.encodePacked(

            intentHash, agent, recipient, amount, expiry

        ));

        bytes32 ethSignedHash = keccak256(abi.encodePacked(

            "\x19Ethereum Signed Message:\n32", messageHash

        ));

        if (_recover(ethSignedHash, signature) != havenSigner) revert InvalidSignature();

        // 4. Policy gate

        if (!paymentGate.isAllowed(agent, recipient, amount)) {

            emit PaymentBlocked(intentHash, agent, "policy_denied");

            revert PolicyDenied();

        }

        // 5. Balance check

        if (balances[agent] < amount) revert InsufficientBalance();

        // 6. CEI — mark used before transfer

        usedIntents[intentHash] = true;

        balances[agent] -= amount;

        // 7. Transfer

        usdc.safeTransfer(recipient, amount);

        emit PaymentExecuted(intentHash, agent, recipient, amount);

    }

    function _recover(bytes32 hash, bytes calldata sig) internal pure returns (address) {

        require(sig.length == 65, "Invalid sig length");

        bytes32 r;

        bytes32 s;

        uint8 v;

        assembly {

            r := calldataload(sig.offset)

            s := calldataload(add(sig.offset, 32))

            v := byte(0, calldataload(add(sig.offset, 64)))

        }

        return ecrecover(hash, v, r, s);

    }

}


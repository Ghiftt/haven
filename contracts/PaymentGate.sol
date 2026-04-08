
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentGate is Ownable {

    // agent => recipient => allowed

    mapping(address => mapping(address => bool)) public allowlist;

    // agent => spend cap (in USDC units, 6 decimals)

    mapping(address => uint256) public spendCap;

    event PolicySet(address indexed agent, address[] recipients, uint256 cap);

    event RecipientAdded(address indexed agent, address recipient);

    event RecipientRemoved(address indexed agent, address recipient);

    constructor() Ownable(msg.sender) {}

    function setPolicy(

        address agent,

        address[] calldata recipients,

        uint256 cap

    ) external onlyOwner {

        spendCap[agent] = cap;

        for (uint i = 0; i < recipients.length; i++) {

            allowlist[agent][recipients[i]] = true;

        }

        emit PolicySet(agent, recipients, cap);

    }

    function removeRecipient(address agent, address recipient) external onlyOwner {

        allowlist[agent][recipient] = false;

        emit RecipientRemoved(agent, recipient);

    }

    function isAllowed(

        address agent,

        address recipient,

        uint256 amount

    ) external view returns (bool) {

        if (!allowlist[agent][recipient]) return false;

        if (amount > spendCap[agent]) return false;

        return true;

    }

}

